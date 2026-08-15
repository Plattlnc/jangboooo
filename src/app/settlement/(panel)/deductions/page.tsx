import { loadRiderDeductions, loadScrapedInsurance } from "@/app/settlement/_lib/deductions";
import { loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { DeductionView } from "@/components/settlement/deduction-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 차감 정산 — 시간제보험료(바로고 주차별 정산내역서 을지 F열 자동) + 필요 시 수동 조정. 금요일 정산 시 별도 차감.
export default async function DeductionsPage() {
  const [riders, deductions, insurance] = await Promise.all([
    loadSettlementRiders(),
    loadRiderDeductions(),
    loadScrapedInsurance(),
  ]);
  return (
    <div>
      <div className="mb-4">
        <DataPulse source="insurance" label="시간제보험료 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <DeductionView
        riders={riders}
        deductions={deductions}
        scraped={insurance.byRider}
        latestDate={insurance.latestDate}
      />
    </div>
  );
}
