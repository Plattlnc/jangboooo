import { getAdminDashboardData, getAdminGoalsData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { toAdminHomeVM } from "@/components/admin/home-vm";
import { fmtRangeLabel } from "@/components/admin/format";
import type { CenterPeakGoalRow } from "@/types/database";

// 관리자 홈 = 오늘(일간) 중심 대시보드. 주간/월간 요약 제거. 매 요청 최신(정적 캐시 방지).
export const dynamic = "force-dynamic";

// 공동목표 4피크 순서/라벨(목표 탭과 동일).
const GOAL_PEAKS: { key: CenterPeakGoalRow["peak_key"]; label: string }[] = [
  { key: "ml", label: "아침점심" },
  { key: "pl", label: "오후논피크" },
  { key: "d", label: "저녁피크" },
  { key: "pd", label: "심야논피크" },
];

export default async function AdminHomePage() {
  const [data, goalsData] = await Promise.all([getAdminDashboardData(), getAdminGoalsData()]);

  // 오늘 공동목표 4피크(당일 실시간).
  const centerGoals = GOAL_PEAKS.map(({ key, label }) => {
    const g = goalsData.today.find((r) => r.peak_key === key);
    return { key, label, current: g?.current ?? null, goal: g?.goal ?? null, pct: g?.pct ?? null };
  });

  const vm = (view: typeof data.today, label: string) =>
    toAdminHomeVM(view, data.riderInfo, data.registeredRiders, label);

  return (
    <AdminHome
      today={vm(data.today, fmtRangeLabel("today", data.today.range))}
      month={vm(data.month, fmtRangeLabel("month", data.month.range))}
      centerGoals={centerGoals}
    />
  );
}
