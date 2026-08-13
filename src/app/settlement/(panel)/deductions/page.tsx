import { loadRiderDeductions } from "@/app/settlement/_lib/deductions";
import { loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { DeductionView } from "@/components/settlement/deduction-view";

export const dynamic = "force-dynamic";

// 차감 정산 — 라이더별 시간제보험료 차감액 입력/저장(금요일 정산 시 별도 차감).
export default async function DeductionsPage() {
  const [riders, deductions] = await Promise.all([loadSettlementRiders(), loadRiderDeductions()]);
  return <DeductionView riders={riders} deductions={deductions} />;
}
