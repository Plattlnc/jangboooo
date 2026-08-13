import { loadRiderDeductions, loadScrapedInsurance } from "@/app/settlement/_lib/deductions";
import { loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { DeductionView } from "@/components/settlement/deduction-view";

export const dynamic = "force-dynamic";

// 차감 정산 — 시간제보험료(배달처리비 xlsx '보험' 시트 자동 스크래핑) + 필요 시 수동 조정. 금요일 정산 시 별도 차감.
export default async function DeductionsPage() {
  const [riders, deductions, insurance] = await Promise.all([
    loadSettlementRiders(),
    loadRiderDeductions(),
    loadScrapedInsurance(),
  ]);
  return (
    <DeductionView
      riders={riders}
      deductions={deductions}
      scraped={insurance.byRider}
      latestDate={insurance.latestDate}
    />
  );
}
