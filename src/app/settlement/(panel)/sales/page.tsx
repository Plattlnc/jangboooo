import { fetchSales } from "@/app/settlement/_lib/sales";
import { SalesView } from "@/components/settlement/sales-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 매출 — 주정산서 세금계산서 내역(역발행) 기준 회사 매출.
export default async function SalesPage() {
  const data = await fetchSales();
  return (
    <div>
      <div className="mb-4">
        <DataPulse source="sales" label="매출(세금계산서) 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <SalesView data={data} />
    </div>
  );
}
