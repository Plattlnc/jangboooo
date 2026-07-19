import { getAdminDashboardData } from "@/lib/supabase/admin-queries";
import { AdminHome } from "@/components/admin/admin-home";

// 관리자 홈 = 통합 대시보드. 매 요청 최신(스크래퍼 1분 주기) — 정적 캐시 방지.
export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const data = await getAdminDashboardData();
  return <AdminHome data={data} />;
}
