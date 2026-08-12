import { getAdminCustomView, getAdminDashboardData, getAdminGoalsData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { toAdminHomeVM } from "@/components/admin/home-vm";
import { isValidIsoDate, buildWeekOptions, buildMonthOptions, weekRangeOf, monthRangeOf } from "@/lib/admin/date-range";
import { fmtRangeLabel } from "@/components/admin/format";
import type { CenterPeakGoalRow } from "@/types/database";

// 관리자 홈 = 통합 대시보드. 탭 없이 일간·주간·월간을 한 화면에 스택.
// 주간=수~화 주 선택(?wk=수요일), 월간=달력월 선택(?mo=YYYY-MM). 현재 주/월은 fresh(data.week/month).
export const dynamic = "force-dynamic";

const YM = /^\d{4}-\d{2}$/;

// 공동목표 4피크 순서/라벨(목표 탭과 동일).
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

  // 오늘 공동목표 4피크(당일 실시간).
  const centerGoals = GOAL_PEAKS.map(({ key, label }) => {
    const g = goalsData.today.find((r) => r.peak_key === key);
    return { key, label, current: g?.current ?? null, goal: g?.goal ?? null, pct: g?.pct ?? null };
  });

  const weekOptions = buildWeekOptions(businessToday, 12);
  const monthOptions = buildMonthOptions(businessToday, 6);
  const curWeek = weekOptions[0].value;
  const curMonth = monthOptions[0].value;

  const wk = isValidIsoDate(sp.wk) && weekOptions.some((o) => o.value === sp.wk) ? (sp.wk as string) : curWeek;
  const mo = typeof sp.mo === "string" && YM.test(sp.mo) && monthOptions.some((o) => o.value === sp.mo) ? sp.mo : curMonth;

  // 현재 주/월은 실시간 데이터(data.week/month) 재사용, 과거는 해당 범위 조회.
  const weekView = wk === curWeek ? data.week : await getAdminCustomView(weekRangeOf(wk));
  const monthView = mo === curMonth ? data.month : await getAdminCustomView(monthRangeOf(mo, businessToday));

  const vm = (view: typeof data.today, label: string) =>
    toAdminHomeVM(view, data.riderInfo, data.registeredRiders, label);

  return (
    <AdminHome
      today={vm(data.today, fmtRangeLabel("today", data.today.range))}
      week={vm(weekView, weekOptions.find((o) => o.value === wk)?.label ?? fmtRangeLabel("week", weekView.range))}
      month={vm(monthView, monthOptions.find((o) => o.value === mo)?.label ?? fmtRangeLabel("month", monthView.range))}
      weekOptions={weekOptions.map((o) => ({ value: o.value, label: o.label }))}
      monthOptions={monthOptions.map((o) => ({ value: o.value, label: o.label }))}
      selectedWeek={wk}
      selectedMonth={mo}
      centerGoals={centerGoals}
    />
  );
}
