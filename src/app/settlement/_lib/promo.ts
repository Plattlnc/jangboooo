import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PROMO_WEEKLY_THRESHOLD, PROMO_UNIT_KRW } from "@/lib/promo";

// 자사 프로모션 정산 — SLA 운영시간(09:00~00:00 = hour 9~23) 완료건을 프로모션 개수로 인정.
// 주간(수~화) 100건 초과분(101건째부터) 건당 2,000원 지급. 일일 탭은 그날의 개수만(지급은 주간 기준).
// 원천: rider_hourly_stats(시간대별 완료). 시간 외(0~8시) 제외.

const IN_HOURS_FROM = 9; // 09:00~ (hour 9 이상 = 운영시간, 0~8 제외)

export interface PromoSettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  /** 09~00시 완료건 = 프로모션 개수(기간) */
  promoCount: number;
  /** 100건 초과분(주간만, 일일은 0) */
  over: number;
  /** 지급액 = 초과분 × 2,000 (주간만) */
  payout: number;
}

export interface PromoTotals {
  riders: number;
  promoCount: number;
  over: number;
  payout: number;
}

export interface PromoSettlement {
  start: string;
  end: string;
  rows: PromoSettlementRow[];
  totals: PromoTotals;
}

/** 기간 [start,end] 09~00시 완료건을 라이더별 합산(페이지드). */
async function fetchInHoursByRider(start: string, end: string): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const BATCH = 1000;
  const base = () =>
    supabase
      .from("rider_hourly_stats")
      .select("admin_rider_id, completed")
      .gte("snapshot_date", start)
      .lte("snapshot_date", end)
      .gte("hour", IN_HOURS_FROM)
      .order("snapshot_date", { ascending: true })
      .order("admin_rider_id", { ascending: true })
      .order("hour", { ascending: true });

  const { count, error: countError } = await supabase
    .from("rider_hourly_stats")
    .select("admin_rider_id", { count: "exact", head: true })
    .gte("snapshot_date", start)
    .lte("snapshot_date", end)
    .gte("hour", IN_HOURS_FROM);
  if (countError) throw new Error(`rider_hourly_stats 카운트 실패: ${countError.message}`);

  const pages = Math.max(1, Math.ceil((count ?? 0) / BATCH));
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => base().range(i * BATCH, (i + 1) * BATCH - 1)),
  );
  const byRider = new Map<string, number>();
  for (const r of results) {
    if (r.error) throw new Error(`rider_hourly_stats 조회 실패: ${r.error.message}`);
    for (const row of r.data ?? []) {
      byRider.set(row.admin_rider_id, (byRider.get(row.admin_rider_id) ?? 0) + (row.completed ?? 0));
    }
  }
  return byRider;
}

/** 기간 자사 프로모션 정산. weekly=true 면 100건 초과분 × 2,000원 지급 계산. */
export async function fetchPromoSettlement(start: string, end: string, weekly: boolean): Promise<PromoSettlement> {
  const byRider = await fetchInHoursByRider(start, end);
  const ids = [...byRider.entries()].filter(([, c]) => c > 0).map(([id]) => id);

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
    const promoCount = byRider.get(id)!;
    const over = weekly ? Math.max(0, promoCount - PROMO_WEEKLY_THRESHOLD) : 0;
    const meta = info.get(id);
    return {
      riderId: id,
      name: meta?.name ?? id,
      phone: meta?.phone ?? null,
      promoCount,
      over,
      payout: over * PROMO_UNIT_KRW,
    };
  });
  rows.sort((a, b) => b.payout - a.payout || b.promoCount - a.promoCount || a.name.localeCompare(b.name, "ko"));

  const totals: PromoTotals = { riders: rows.length, promoCount: 0, over: 0, payout: 0 };
  for (const r of rows) {
    totals.promoCount += r.promoCount;
    totals.over += r.over;
    totals.payout += r.payout;
  }

  return { start, end, rows, totals };
}
