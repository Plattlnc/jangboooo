import { fetchDashboard } from "@/app/settlement/_lib/dashboard";
import { DashboardView } from "@/components/settlement/dashboard-view";

export const dynamic = "force-dynamic";

// 정산 홈(대시보드) — 회사 현황 한눈에: 매출(관리비)·세트 달성·주간 정산·일별 완료 추이·라이더 현황.
export default async function SettlementHome() {
  const data = await fetchDashboard();
  return <DashboardView data={data} />;
}
