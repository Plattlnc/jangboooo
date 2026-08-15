import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 주간 매출(관리비) — grider '관리비' 시트 적재분(weekly_revenue, 0027). 회사 메인 수입.
// 관리수수료 = 기본 관리비(슬롯 달성·수락률) + 보너스관리비(세트수·연속달성). VAT 별도.

export interface RevenueWeek {
  weekStart: string;
  weekEnd: string;
  mgmtFeeTotal: number;
  baseFee: number;
  bonusFee: number;
  etcFee: number;
  paybackTotal: number;
  setCount: number | null;
  perSetVolume: number | null;
  totalOrderVolume: number | null;
  effectiveVolume: number | null;
  low3Achievement: number | null;
  totalSlots: number | null;
  achievedSlots: number | null;
  missedSlots: number | null;
  acceptanceRate: number | null;
}

export interface RevenueData {
  weeks: RevenueWeek[]; // 최신순
  capturedAt: string | null;
}

export async function fetchRevenue(): Promise<RevenueData> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("weekly_revenue")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(200);
    if (error || !data) return { weeks: [], capturedAt: null };
    const weeks: RevenueWeek[] = data.map((r) => ({
      weekStart: r.week_start,
      weekEnd: r.week_end,
      mgmtFeeTotal: r.mgmt_fee_total,
      baseFee: r.base_fee,
      bonusFee: r.bonus_fee,
      etcFee: r.etc_fee,
      paybackTotal: r.payback_total,
      setCount: r.set_count,
      perSetVolume: r.per_set_volume,
      totalOrderVolume: r.total_order_volume,
      effectiveVolume: r.effective_volume,
      low3Achievement: r.low3_achievement,
      totalSlots: r.total_slots,
      achievedSlots: r.achieved_slots,
      missedSlots: r.missed_slots,
      acceptanceRate: r.acceptance_rate,
    }));
    const capturedAt = data.length ? (data[0].captured_at as string) : null;
    return { weeks, capturedAt };
  } catch {
    return { weeks: [], capturedAt: null };
  }
}
