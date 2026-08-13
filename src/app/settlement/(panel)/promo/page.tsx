import { fetchPromoSettlement } from "@/app/settlement/_lib/promo";
import { loadRiderNotes, loadRiderMemos } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd, weekRangeOf } from "@/app/settlement/_lib/dates";
import { PromoTabs } from "@/components/settlement/promo-tabs";

export const dynamic = "force-dynamic";

// 자사 프로모션 정산 — 주간(수~화) 전용. ?date=YYYY-MM-DD(기준일이 속한 주).
// 09~00시 완료건을 프로모션 개수로 집계, 주간 100건 초과분 × 2,000원 지급.
export default async function PromoSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const ref = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const { start, end } = weekRangeOf(ref);

  const [data, notes, memos] = await Promise.all([
    fetchPromoSettlement(start, end, true),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return <PromoTabs data={data} today={kstToday()} notes={notes} memos={memos} />;
}
