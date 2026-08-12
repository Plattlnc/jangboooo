import { getAdminCustomView, getAdminDashboardData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { toAdminHomeVM } from "@/components/admin/home-vm";
import {
  addDaysIso,
  clampCustomRange,
  isValidIsoDate,
  buildWeekOptions,
  buildMonthOptions,
  weekRangeOf,
  monthRangeOf,
} from "@/lib/admin/date-range";
import { fmtDateRange, fmtRangeLabel } from "@/components/admin/format";

// 관리자 홈 = 통합 대시보드. 매 요청 최신(스크래퍼 1분 주기) — 정적 캐시 방지.
// 주간=수~화 주 선택(?wk=수요일), 월간=달력월 선택(?mo=YYYY-MM). 현재 주/월은 fresh(data.week/month).
export const dynamic = "force-dynamic";

const YM = /^\d{4}-\d{2}$/;

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await getAdminDashboardData();
  const businessToday = data.today.range.start_date;

  const weekOptions = buildWeekOptions(businessToday, 12);
  const monthOptions = buildMonthOptions(businessToday, 6);
  const curWeek = weekOptions[0].value;
  const curMonth = monthOptions[0].value;

  const wk = isValidIsoDate(sp.wk) && weekOptions.some((o) => o.value === sp.wk) ? (sp.wk as string) : curWeek;
  const mo = typeof sp.mo === "string" && YM.test(sp.mo) && monthOptions.some((o) => o.value === sp.mo) ? sp.mo : curMonth;

  // 현재 주/월은 실시간 데이터(data.week/month) 재사용, 과거는 해당 범위 조회.
  const weekView = wk === curWeek ? data.week : await getAdminCustomView(weekRangeOf(wk));
  const monthView = mo === curMonth ? data.month : await getAdminCustomView(monthRangeOf(mo, businessToday));

  const customRange = clampCustomRange(sp.from, sp.to, businessToday, 7);
  const customView = customRange ? await getAdminCustomView(customRange) : null;

  const tabParam = typeof sp.tab === "string" ? sp.tab : undefined;
  const initialTab =
    tabParam === "week" || tabParam === "month" || tabParam === "today" || tabParam === "custom"
      ? tabParam
      : customRange
        ? "custom"
        : "today";

  const vm = (view: typeof data.today, label: string) =>
    toAdminHomeVM(view, data.riderInfo, data.registeredRiders, label);

  return (
    <AdminHome
      today={vm(data.today, fmtRangeLabel("today", data.today.range))}
      week={vm(weekView, weekOptions.find((o) => o.value === wk)?.label ?? fmtRangeLabel("week", weekView.range))}
      month={vm(monthView, monthOptions.find((o) => o.value === mo)?.label ?? fmtRangeLabel("month", monthView.range))}
      custom={customView && customRange ? vm(customView, fmtDateRange(customRange)) : null}
      customRange={customRange ? { from: customRange.start_date, to: customRange.end_date } : null}
      maxDate={addDaysIso(businessToday, -1)}
      weekOptions={weekOptions.map((o) => ({ value: o.value, label: o.label }))}
      monthOptions={monthOptions.map((o) => ({ value: o.value, label: o.label }))}
      selectedWeek={wk}
      selectedMonth={mo}
      initialTab={initialTab}
    />
  );
}
