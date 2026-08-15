import { fetchFridaySettlement, listSettlementWeeks } from "@/app/settlement/_lib/friday";
import { loadTerminatedRiderIds } from "@/app/settlement/_lib/contract";
import { isValidYmd } from "@/app/settlement/_lib/dates";
import { FridayView } from "@/components/settlement/friday-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 정산 합계 — 금요일 정산 4개 항목(본사미션·추가지급·자사프로모션·차감) 라이더별 합산. ?week=주시작(수).
export default async function FridaySettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const weeks = await listSettlementWeeks();
  const weekStart = isValidYmd(sp.week) && weeks.some((w) => w.start === sp.week) ? sp.week! : weeks[0]?.start;

  if (!weekStart) {
    return (
      <div>
        <div className="grid place-items-center rounded-[12px] border border-jb-line bg-jb-card py-16 text-center text-[13px] text-jb-ink-mute">
          정산 데이터가 아직 없습니다.
        </div>
      </div>
    );
  }

  const [data, terminated] = await Promise.all([fetchFridaySettlement(weekStart), loadTerminatedRiderIds()]);

  return (
    <div>
      <div className="mb-4">
        <DataPulse source="insurance" label="주간 정산 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <FridayView key={weekStart} data={data} terminated={terminated} />
    </div>
  );
}
