import { fetchMissionSettlement } from "@/app/settlement/_lib/mission";
import { loadRiderNotes, loadRiderMemos, loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd } from "@/app/settlement/_lib/dates";
import { MissionTabs } from "@/components/settlement/mission-tabs";

export const dynamic = "force-dynamic";

// 본사 미션 정산 — ?date=YYYY-MM-DD (기본: 어제, T+1). [정산 내역] 테이블 + [기타] 라이더별 메모·특이사항.
export default async function MissionSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const [data, riders, notes, memos] = await Promise.all([
    fetchMissionSettlement(date),
    loadSettlementRiders(),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return <MissionTabs data={data} today={kstToday()} riders={riders} notes={notes} memos={memos} />;
}
