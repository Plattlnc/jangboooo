import { fetchMissionSettlement } from "@/app/settlement/_lib/mission";
import { loadRiderNotes, loadRiderMemos } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd, weekRangeOf } from "@/app/settlement/_lib/dates";
import { MissionTabs } from "@/components/settlement/mission-tabs";

export const dynamic = "force-dynamic";

// 본사 미션 정산 — 상단 [일일/주간] 선택. ?period=daily|weekly & ?date=YYYY-MM-DD(기준일).
// 일일=그날 하루, 주간=그 날짜가 속한 수~화 주간 합산. (월간 미포함)
export default async function MissionSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period === "weekly" ? "weekly" : "daily";
  const ref = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const { start, end } = period === "weekly" ? weekRangeOf(ref) : { start: ref, end: ref };

  const [data, notes, memos] = await Promise.all([
    fetchMissionSettlement(start, end),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return <MissionTabs data={data} period={period} today={kstToday()} notes={notes} memos={memos} />;
}
