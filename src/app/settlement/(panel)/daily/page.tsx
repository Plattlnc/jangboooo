import { fetchDailySettlement } from "@/app/settlement/_lib/daily";
import { loadRiderNotes, loadRiderMemos, loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd } from "@/app/settlement/_lib/dates";
import { DailyTabs } from "@/components/settlement/daily-tabs";

export const dynamic = "force-dynamic";

// 일일 정산 — ?date=YYYY-MM-DD (기본: 어제, 배달처리비 T+1). [정산 내역] 테이블 + [기타] 라이더별 특이사항.
export default async function DailySettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const [data, riders, notes, memos] = await Promise.all([
    fetchDailySettlement(date),
    loadSettlementRiders(),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return <DailyTabs data={data} today={kstToday()} riders={riders} notes={notes} memos={memos} />;
}
