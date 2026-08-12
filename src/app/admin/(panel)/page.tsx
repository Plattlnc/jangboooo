import { getAdminCustomView, getAdminDashboardData, getAdminGoalsData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { toAdminHomeVM } from "@/components/admin/home-vm";
import { isValidIsoDate, buildWeekOptions, buildMonthOptions, weekRangeOf, monthRangeOf } from "@/lib/admin/date-range";
import { fmtRangeLabel } from "@/components/admin/format";
import type { CenterPeakGoalRow } from "@/types/database";

// 관리자 홈 = 통합 대시보드. 상단 오늘/주/월 선택 → 단일 화면이 그 기간 반영.
// 주(수~화) ?wk=수요일, 월(달력월) ?mo=YYYY-MM. 없으면 오늘. 매 요청 최신.
export const dynamic = "force-dynamic";

const YM = /^\d{4}-\d{2}$/;

const GOAL_PEAKS: { key: CenterPeakGoalRow["peak_key"]; label: string }[] = [
  { key: "ml", label: "아침점심" },
  { key: "pl", label: "오후논피크" },
  { key: "d", label: "저녁피크" },
  { key: "pd", label: "심야논피크" },
];

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const [data, goalsData] = await Promise.all([getAdminDashboardData(), getAdminGoalsData()]);
  const businessToday = data.today.range.start_date;

  // 오늘 공동목표 4피크(항상 당일 실시간).
  const centerGoals = GOAL_PEAKS.map(({ key, label }) => {
    const g = goalsData.today.find((r) => r.peak_key === key);
    return { key, label, current: g?.current ?? null, goal: g?.goal ?? null, pct: g?.pct ?? null };
  });

  const weekRaw = buildWeekOptions(businessToday, 12);
  const monthRaw = buildMonthOptions(businessToday, 6);
  // 드롭다운 라벨 = ISO 날짜(주: YYYY-MM-DD ~ YYYY-MM-DD, 월: YYYY-MM).
  const weekOptions = weekRaw.map((o) => ({ value: o.value, label: `${o.range.start_date} ~ ${o.range.end_date}` }));
  const monthOptions = monthRaw.map((o) => ({ value: o.value, label: o.value }));

  const wk = isValidIsoDate(sp.wk) && weekRaw.some((o) => o.value === sp.wk) ? (sp.wk as string) : undefined;
  const mo = typeof sp.mo === "string" && YM.test(sp.mo) && monthRaw.some((o) => o.value === sp.mo) ? sp.mo : undefined;

  // 활성 기간: mo > wk > today. 현재 주/월은 fresh(data), 과거는 조회.
  let activeView = data.today;
  let activePeriod: "today" | "week" | "month" = "today";
  let label = fmtRangeLabel("today", data.today.range);
  if (mo) {
    activeView = mo === monthRaw[0].value ? data.month : await getAdminCustomView(monthRangeOf(mo, businessToday));
    activePeriod = "month";
    label = mo;
  } else if (wk) {
    activeView = wk === weekRaw[0].value ? data.week : await getAdminCustomView(weekRangeOf(wk));
    activePeriod = "week";
    label = weekOptions.find((o) => o.value === wk)?.label ?? fmtRangeLabel("week", activeView.range);
  }

  return (
    <AdminHome
      view={toAdminHomeVM(activeView, data.riderInfo, data.registeredRiders, label)}
      activePeriod={activePeriod}
      weekOptions={weekOptions}
      monthOptions={monthOptions}
      selectedWeek={wk ?? weekRaw[0].value}
      selectedMonth={mo ?? monthRaw[0].value}
      centerGoals={centerGoals}
    />
  );
}
