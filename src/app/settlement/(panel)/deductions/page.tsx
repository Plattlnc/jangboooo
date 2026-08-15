import { listInsuranceWeeks, fetchInsuranceForWeek, loadRiderDeductions } from "@/app/settlement/_lib/deductions";
import { loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { loadTerminatedRiderIds } from "@/app/settlement/_lib/contract";
import { isValidYmd } from "@/app/settlement/_lib/dates";
import { DeductionView } from "@/components/settlement/deduction-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 차감 정산 — 시간제보험료(주차별, 을지 F열 자동) + 주차별 수동 조정. 주차(수~화) 이동으로 각 주 기록 조회.
export default async function DeductionsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weeks = await listInsuranceWeeks();
  const weekStart = isValidYmd(sp.week) && weeks.some((w) => w.start === sp.week) ? sp.week! : weeks[0]?.start;
  const week = weeks.find((w) => w.start === weekStart) ?? null;

  const [riders, deductions, insurance, terminated] = await Promise.all([
    loadSettlementRiders(),
    weekStart ? loadRiderDeductions(weekStart) : Promise.resolve({}),
    weekStart ? fetchInsuranceForWeek(weekStart) : Promise.resolve({}),
    loadTerminatedRiderIds(),
  ]);

  return (
    <div>
      <div className="mb-4">
        <DataPulse source="insurance" label="시간제보험료 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <DeductionView
        key={weekStart ?? "none"}
        riders={riders}
        deductions={deductions}
        scraped={insurance}
        weeks={weeks}
        week={week}
        terminated={terminated}
      />
    </div>
  );
}
