import { fetchExtraPayments } from "@/app/settlement/_lib/extra";
import { loadTerminatedRiderIds } from "@/app/settlement/_lib/contract";
import { isValidYmd } from "@/app/settlement/_lib/dates";
import { ExtraPaymentsView } from "@/components/settlement/extra-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 추가 지급 — 바로고 주차별 정산내역서 '추가배달료' 시트(기상할증 보정 등 사후 소급 지급).
// 본사 미션(프로모션 시트)과 별개 항목: 을지 '추가지급 B' = 본사미션 + 이 내역 합.
// ?week=YYYY-MM-DD(주 시작 수요일) — 미지정 시 적재된 최신 주차.
export default async function ExtraPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const week = isValidYmd(sp.week) ? sp.week : undefined;
  const [data, terminated] = await Promise.all([fetchExtraPayments(week), loadTerminatedRiderIds()]);
  return (
    <div>
      <div className="mb-4">
        <DataPulse source="extra" label="추가 지급 데이터" cadence="주간 정산서(수~화) 반영" />
      </div>
      <ExtraPaymentsView data={data} terminated={terminated} />
    </div>
  );
}
