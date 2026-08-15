import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchRevenue, type RevenueWeek } from "@/app/settlement/_lib/revenue";
import { fetchPromoSettlement } from "@/app/settlement/_lib/promo";

// 정산 홈(대시보드) — 회사 현황 한눈에. 최신 확정 주(수~화) 기준 매출·정산 + 일별 완료 추이 + 라이더 현황.

export interface DailyPoint {
  date: string;
  completed: number;
  riders: number;
}

export interface DashboardData {
  // 기준 주(최신 확정 주정산서)
  week: { start: string; end: string } | null;
  revenue: RevenueWeek | null; // 관리비(매출)
  prevRevenue: RevenueWeek | null;
  revenueTrend: { weekStart: string; weekEnd: string; mgmtFeeTotal: number }[]; // 최신순
  // 주간 정산 총액
  feeTotal: number; // 배달처리비
  missionTotal: number; // 본사 미션
  promoGross: number; // 자사 프로모션(세전 총액)
  promoRiders: number; // 프로모션 대상 라이더수
  completedTotalWeek: number;
  activeRidersWeek: number;
  // 일별 완료건 추이(최근 14일, 최신순)
  daily: DailyPoint[];
  // 라이더 현황
  ridersActive: number; // 계약중
  ridersTerminated: number; // 계약종료
  ridersToday: number; // 오늘 활동 라이더
}

export async function fetchDashboard(): Promise<DashboardData> {
  const supabase = createAdminClient();

  const rev = await fetchRevenue();
  const revenue = rev.weeks[0] ?? null;
  const prevRevenue = rev.weeks[1] ?? null;
  const week = revenue ? { start: revenue.weekStart, end: revenue.weekEnd } : null;
  const revenueTrend = rev.weeks.slice(0, 8).map((w) => ({
    weekStart: w.weekStart,
    weekEnd: w.weekEnd,
    mgmtFeeTotal: w.mgmtFeeTotal,
  }));

  const [dailyRes, contractRes, promo, weekTotals] = await Promise.all([
    supabase.rpc("get_daily_completed", { p_days: 14 }),
    supabase.from("rider_contract_status").select("is_terminated"),
    week ? fetchPromoSettlement(week.start, week.end, true) : Promise.resolve(null),
    week
      ? supabase.rpc("get_week_settlement_totals", { p_start: week.start, p_end: week.end })
      : Promise.resolve({ data: null } as { data: null }),
  ]);

  const daily: DailyPoint[] = (dailyRes.data ?? []).map((r) => ({
    date: r.day,
    completed: Number(r.completed ?? 0),
    riders: Number(r.riders ?? 0),
  }));

  const contracts = contractRes.data ?? [];
  const ridersActive = contracts.filter((c) => !c.is_terminated).length;
  const ridersTerminated = contracts.filter((c) => c.is_terminated).length;
  const ridersToday = daily[0]?.riders ?? 0;

  const wt = (weekTotals as { data: { fee_total: number; mission_total: number; completed_total: number; active_riders: number }[] | null }).data?.[0];

  return {
    week,
    revenue,
    prevRevenue,
    revenueTrend,
    feeTotal: Number(wt?.fee_total ?? 0),
    missionTotal: Number(wt?.mission_total ?? 0),
    promoGross: promo?.totals.gross ?? 0,
    promoRiders: promo ? promo.rows.filter((r) => r.gross > 0).length : 0,
    completedTotalWeek: Number(wt?.completed_total ?? 0),
    activeRidersWeek: Number(wt?.active_riders ?? 0),
    daily,
    ridersActive,
    ridersTerminated,
    ridersToday,
  };
}
