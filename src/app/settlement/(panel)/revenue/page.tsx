import { fetchRevenue } from "@/app/settlement/_lib/revenue";
import { RevenueView } from "@/components/settlement/revenue-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 매출 — 회사 메인 수입인 관리비(관리수수료). grider 주정산서 '관리비' 시트 자동 집계.
export default async function RevenuePage() {
  const data = await fetchRevenue();
  return (
    <div>
      <div className="mb-4">
        <DataPulse source="revenue" label="매출(관리비) 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <RevenueView data={data} />
    </div>
  );
}
