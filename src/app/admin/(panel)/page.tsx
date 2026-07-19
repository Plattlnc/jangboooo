import { getAdminCustomView, getAdminDashboardData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";
import { addDaysIso, clampCustomRange } from "@/lib/admin/date-range";
import { fmtDateRange } from "@/components/admin/format";

// 관리자 홈 = 통합 대시보드. 매 요청 최신(스크래퍼 1분 주기) — 정적 캐시 방지.
// from/to 쿼리 = 날짜 직접 선택(포함 최대 7일, 당일 제외 — 서버 클램프).
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
  const custom = customRange
    ? { view: await getAdminCustomView(customRange), label: fmtDateRange(customRange) }
    : null;

  return <AdminHome data={data} custom={custom} maxDate={addDaysIso(businessToday, -1)} />;
}
