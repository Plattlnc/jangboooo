import { getAdminCustomView, getAdminDashboardData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { toAdminHomeVM } from "@/components/admin/home-vm";
import { addDaysIso, clampCustomRange } from "@/lib/admin/date-range";
import { fmtDateRange, fmtRangeLabel } from "@/components/admin/format";

// 관리자 홈 = 통합 대시보드. 매 요청 최신(스크래퍼 1분 주기) — 정적 캐시 방지.
// from/to 쿼리 = 날짜 직접 선택(포함 최대 7일, 당일 제외 — 서버 클램프).
// 뷰모델은 서버에서 프리컴퓨트(home-vm) — 클라이언트 페이로드 슬림화.
export const dynamic = "force-dynamic";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await getAdminDashboardData();
  const businessToday = data.today.range.start_date;

  const customRange = clampCustomRange(sp.from, sp.to, businessToday, 7);
  const customView = customRange ? await getAdminCustomView(customRange) : null;

  const vm = (view: typeof data.today, label: string) =>
    toAdminHomeVM(view, data.riderInfo, data.registeredRiders, label);

  return (
    <AdminHome
      today={vm(data.today, fmtRangeLabel("today", data.today.range))}
      week={vm(data.week, fmtRangeLabel("week", data.week.range))}
      month={vm(data.month, fmtRangeLabel("month", data.month.range))}
      custom={customView && customRange ? vm(customView, fmtDateRange(customRange)) : null}
      customRange={customRange ? { from: customRange.start_date, to: customRange.end_date } : null}
      maxDate={addDaysIso(businessToday, -1)}
    />
  );
}
