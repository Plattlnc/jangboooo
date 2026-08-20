import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDeductions } from "@/app/settlement/_lib/rates";
import { loadPromoRules } from "@/app/settlement/_lib/promo-rules";

// 자사 프로모션 정산 — SLA 운영시간(09:00~00:00 = hour 9~23) 완료건을 프로모션 개수로 인정.
// 주간(수~화) 100건 초과분(101건째부터) 건당 2,000원(세전). 원천세(3.3%)·고용산재(1.8%) 공제 후 지급액.
// 수수료(완료건당 100원)는 미적용. 원천: rider_hourly_stats(시간대별 완료). 시간 외(0~8시) 제외.
// 지급 조건: 수락률 80% 이상(사용자 확정, 2026-08-20) — 계산엔 반영 안 함(표시·배지만), 미달 라이더는
// 수동 제외. 수락률=배민 공식(푸드완료 / 푸드완료+거절+취소+귀책, breakdown 전무 시 저장된 일별 acceptance_rate 평균 폴백).

const IN_HOURS_FROM = 9; // 09:00~ (hour 9 이상 = 운영시간, 0~8 제외)
export const PROMO_ACCEPTANCE_MIN = 80; // 지급 대상 수락률 하한(%, 미달=배지 표시)

export interface PromoSettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  /** 09~00시 완료건 = 프로모션 개수(기간) */
  promoCount: number;
  /** 100건 초과분(주간만, 일일은 0) */
  over: number;
  /** 프로모션 세전 = 초과분 × 2,000 */
  gross: number;
  wht: number;
  ins: number;
  /** 지급액 = 세전 − 원천세 − 고용산재 */
  payout: number;
  /** 수락률(%, 푸드 공식). 활동 없거나 계산 불가 = null. 지급 계산엔 미반영(표시용). */
  acceptanceRate: number | null;
}

export interface PromoTotals {
  riders: number;
  promoCount: number;
  over: number;
  gross: number;
  wht: number;
  ins: number;
  payout: number;
}

export interface PromoSettlement {
  start: string;
  end: string;
  threshold: number; // 이 주 초과 기준(건)
  unit: number; // 이 주 건당 단가(원)
  basis: "operating" | "daily"; // 완료건 집계 기준
  rows: PromoSettlementRow[];
  totals: PromoTotals;
}

/** 기간 [start,end] 완료건을 라이더별 합산(페이지드). op=09~00시(운영시간), daily=일일 전체. */
async function fetchCountsByRider(start: string, end: string): Promise<Map<string, { op: number; daily: number }>> {
  const supabase = createAdminClient();
  const BATCH = 1000;
  const base = () =>
    supabase
      .from("rider_hourly_stats")
      .select("admin_rider_id, hour, completed")
      .gte("snapshot_date", start)
      .lte("snapshot_date", end)
      .gt("completed", 0)
      .order("snapshot_date", { ascending: true })
      .order("admin_rider_id", { ascending: true })
      .order("hour", { ascending: true });

  const { count, error: countError } = await supabase
    .from("rider_hourly_stats")
    .select("admin_rider_id", { count: "exact", head: true })
    .gte("snapshot_date", start)
    .lte("snapshot_date", end)
    .gt("completed", 0);
  if (countError) throw new Error(`rider_hourly_stats 카운트 실패: ${countError.message}`);

  const pages = Math.max(1, Math.ceil((count ?? 0) / BATCH));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => base().range(i * BATCH, (i + 1) * BATCH - 1)),
  );
  const byRider = new Map<string, { op: number; daily: number }>();
  for (const r of results) {
    if (r.error) throw new Error(`rider_hourly_stats 조회 실패: ${r.error.message}`);
    for (const row of r.data ?? []) {
      const a = byRider.get(row.admin_rider_id) ?? { op: 0, daily: 0 };
      const c = row.completed ?? 0;
      a.daily += c;
      if ((row.hour ?? 0) >= IN_HOURS_FROM) a.op += c;
      byRider.set(row.admin_rider_id, a);
    }
  }
  return byRider;
}

/**
 * 기간 라이더별 수락률(%, 푸드 공식). 지급 계산에는 미반영 — 표시·80% 미달 배지용.
 * 산식: sum(food.complete) / sum(food.complete+reject+cancel+riderFault). breakdown 전무면 저장된
 * 일별 acceptance_rate 평균 폴백(관리자 홈 [[src/lib/admin/aggregate.ts]] 와 동일 정책).
 */
async function fetchAcceptanceByRider(start: string, end: string): Promise<Map<string, number | null>> {
  const supabase = createAdminClient();
  const BATCH = 1000;
  const base = () =>
    supabase
      .from("sla_snapshots")
      .select("admin_rider_id, breakdown, acceptance_rate")
      .gte("snapshot_date", start)
      .lte("snapshot_date", end)
      .order("snapshot_date", { ascending: true })
      .order("admin_rider_id", { ascending: true });

  const { count, error: countError } = await supabase
    .from("sla_snapshots")
    .select("admin_rider_id", { count: "exact", head: true })
    .gte("snapshot_date", start)
    .lte("snapshot_date", end);
  if (countError) throw new Error(`sla_snapshots 카운트 실패: ${countError.message}`);

  const pages = Math.max(1, Math.ceil((count ?? 0) / BATCH));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => base().range(i * BATCH, (i + 1) * BATCH - 1)),
  );

  type Acc = { complete: number; reject: number; cancel: number; riderFault: number; accSum: number; accCount: number };
  const perRider = new Map<string, Acc>();
  for (const r of results) {
    if (r.error) throw new Error(`sla_snapshots 조회 실패: ${r.error.message}`);
    for (const row of r.data ?? []) {
      const a = perRider.get(row.admin_rider_id) ?? { complete: 0, reject: 0, cancel: 0, riderFault: 0, accSum: 0, accCount: 0 };
      const food = row.breakdown?.food;
      if (food) {
        a.complete += food.complete ?? 0;
        a.reject += food.reject ?? 0;
        a.cancel += food.cancel ?? 0;
        a.riderFault += food.riderFault ?? 0;
      }
      if (row.acceptance_rate != null) {
        a.accSum += row.acceptance_rate;
        a.accCount += 1;
      }
      perRider.set(row.admin_rider_id, a);
    }
  }

  const out = new Map<string, number | null>();
  for (const [id, a] of perRider) {
    const denom = a.complete + a.reject + a.cancel + a.riderFault;
    const rate = denom > 0
      ? Math.round((a.complete / denom) * 10000) / 100 // 소수 2자리(자릿수 스펙 유지 — 정수 반올림 금지)
      : a.accCount > 0
        ? Math.round((a.accSum / a.accCount) * 100) / 100 // 폴백: 일별 저장값 평균
        : null;
    out.set(id, rate);
  }
  return out;
}

/** 기간 자사 프로모션 정산. weekly=true 면 100건 초과분 × 2,000원 지급 계산. */
export async function fetchPromoSettlement(start: string, end: string, weekly: boolean): Promise<PromoSettlement> {
  const [counts, acceptance] = await Promise.all([
    fetchCountsByRider(start, end),
    fetchAcceptanceByRider(start, end),
  ]);
  const rules = await loadPromoRules();
  const rule = rules[start] ?? { threshold: 0, unit: 0, basis: "operating" as const };
  const useDaily = rule.basis === "daily";
  const ids = [...counts.entries()].filter(([, c]) => (useDaily ? c.daily : c.op) > 0).map(([id]) => id);

  const info = new Map<string, { name: string | null; phone: string | null }>();
  if (ids.length > 0) {
    const supabase = createAdminClient();
    const { data: riders } = await supabase
      .from("riders")
      .select("admin_rider_id, name, phone")
      .in("admin_rider_id", ids);
    for (const r of riders ?? []) info.set(r.admin_rider_id, { name: r.name, phone: r.phone });
  }

  const rows: PromoSettlementRow[] = ids.map((id) => {
    const c = counts.get(id)!;
    const promoCount = useDaily ? c.daily : c.op;
    const over = weekly && rule.unit > 0 ? Math.max(0, promoCount - rule.threshold) : 0;
    const gross = over * rule.unit; // 세전
    const d = applyDeductions(gross, 0); // 원천세·고용산재만(수수료 미적용)
    const meta = info.get(id);
    return {
      riderId: id,
      name: meta?.name ?? id,
      phone: meta?.phone ?? null,
      promoCount,
      over,
      gross,
      wht: d.wht,
      ins: d.ins,
      payout: d.payout,
      acceptanceRate: acceptance.get(id) ?? null,
    };
  });
  rows.sort((a, b) => b.payout - a.payout || b.promoCount - a.promoCount || a.name.localeCompare(b.name, "ko"));

  const totals: PromoTotals = { riders: rows.length, promoCount: 0, over: 0, gross: 0, wht: 0, ins: 0, payout: 0 };
  for (const r of rows) {
    totals.promoCount += r.promoCount;
    totals.over += r.over;
    totals.gross += r.gross;
    totals.wht += r.wht;
    totals.ins += r.ins;
    totals.payout += r.payout;
  }

  return { start, end, threshold: rule.threshold, unit: rule.unit, basis: rule.basis, rows, totals };
}
