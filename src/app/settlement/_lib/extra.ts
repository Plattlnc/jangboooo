import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { paginate } from "@/app/settlement/_lib/monthly";

// 추가 지급(소급 보정) — 바로고 주차별 정산내역서 '추가배달료' 시트 적재분(rider_extra_payments, 0024).
// 기상할증 보정 등 배민 daily 배달처리비에 미반영되는 사후 소급 지급을 주 단위로 정리.
// 본사미션(프로모션 시트)과 별개 항목 — 을지 '추가지급 B' = 프로모션 + 이 시트 합.

export interface ExtraPaymentItem {
  amountKrw: number;
  deliveryInfo: string; // 예: 20260803_7817LRHQ (대상 배달일_배달번호)
  reason: string; // 예: 20260803-20260805_기상할증 보정
}

export interface ExtraPaymentRow {
  riderId: string;
  name: string;
  count: number;
  totalKrw: number;
  items: ExtraPaymentItem[];
}

export interface ExtraPayments {
  weekStart: string;
  weekEnd: string;
  rows: ExtraPaymentRow[];
  totalKrw: number;
  totalCount: number;
  /** 데이터가 적재된 주차 목록(최신순) — 주 이동 내비용. */
  availableWeeks: { start: string; end: string }[];
  /** 이 주차 데이터의 최신 적재 시각(ISO) — 미적재면 null. */
  capturedAt: string | null;
}

/** 적재된 주차 목록(최신순, 중복 제거). */
async function listWeeks(): Promise<{ start: string; end: string }[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("rider_extra_payments")
    .select("week_start, week_end")
    .order("week_start", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`rider_extra_payments 주차 조회 실패: ${error.message}`);
  const seen = new Set<string>();
  const out: { start: string; end: string }[] = [];
  for (const r of data ?? []) {
    if (seen.has(r.week_start)) continue;
    seen.add(r.week_start);
    out.push({ start: r.week_start, end: r.week_end });
  }
  return out;
}

/**
 * 주차(수~화)별 추가 지급 내역 — 라이더별 합산 + 건별 상세.
 * weekStart 미지정 시 적재된 최신 주차. 데이터 없으면 rows 빈 배열.
 */
export async function fetchExtraPayments(weekStart?: string): Promise<ExtraPayments> {
  const supabase = createAdminClient();
  const availableWeeks = await listWeeks();
  const week = weekStart
    ? availableWeeks.find((w) => w.start === weekStart) ?? { start: weekStart, end: weekStart }
    : availableWeeks[0];
  if (!week) {
    return { weekStart: "", weekEnd: "", rows: [], totalKrw: 0, totalCount: 0, availableWeeks, capturedAt: null };
  }

  const items = await paginate<{
    admin_rider_id: string;
    rider_name: string | null;
    amount_krw: number;
    delivery_info: string;
    reason: string;
    captured_at: string;
  }>(
    () =>
      supabase
        .from("rider_extra_payments")
        .select("admin_rider_id, rider_name, amount_krw, delivery_info, reason, captured_at")
        .eq("week_start", week.start)
        .order("admin_rider_id")
        .order("delivery_info"),
    () =>
      supabase
        .from("rider_extra_payments")
        .select("admin_rider_id", { count: "exact", head: true })
        .eq("week_start", week.start),
  );

  const byRider = new Map<string, ExtraPaymentRow>();
  let capturedAt: string | null = null;
  for (const it of items) {
    if (capturedAt == null || it.captured_at > capturedAt) capturedAt = it.captured_at;
    let row = byRider.get(it.admin_rider_id);
    if (!row) {
      row = { riderId: it.admin_rider_id, name: it.rider_name ?? it.admin_rider_id, count: 0, totalKrw: 0, items: [] };
      byRider.set(it.admin_rider_id, row);
    }
    row.count += 1;
    row.totalKrw += it.amount_krw;
    row.items.push({ amountKrw: it.amount_krw, deliveryInfo: it.delivery_info, reason: it.reason });
  }
  const rows = [...byRider.values()].sort((a, b) => b.totalKrw - a.totalKrw || a.name.localeCompare(b.name, "ko"));

  return {
    weekStart: week.start,
    weekEnd: week.end,
    rows,
    totalKrw: rows.reduce((s, r) => s + r.totalKrw, 0),
    totalCount: rows.reduce((s, r) => s + r.count, 0),
    availableWeeks,
    capturedAt,
  };
}
