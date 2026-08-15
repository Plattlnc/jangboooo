import { fetchDailySettlement } from "@/app/settlement/_lib/daily";
import { loadRiderNotes, loadRiderMemos } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd } from "@/app/settlement/_lib/dates";
import { DailyTabs } from "@/components/settlement/daily-tabs";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 일일 정산 — ?date=YYYY-MM-DD (기본: 어제, 배달처리비 T+1). 정산 내역 테이블(메모·특이사항 인라인).
export default async function DailySettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const [data, notes, memos] = await Promise.all([
    fetchDailySettlement(date),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return (
    <div>
      <div className="mb-4"><DataPulse source="daily" label="배달처리비 데이터" cadence="매일 08:00 자동 수집 (전일분)" /></div>
      <DailyTabs data={data} today={kstToday()} notes={notes} memos={memos} />
    </div>
  );
}
