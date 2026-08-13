import { fetchPromoSettlement } from "@/app/settlement/_lib/promo";
import { loadRiderNotes, loadRiderMemos } from "@/app/settlement/_lib/notes";
import { kstToday, kstYesterday, isValidYmd, weekRangeOf } from "@/app/settlement/_lib/dates";
import { PromoTabs } from "@/components/settlement/promo-tabs";

export const dynamic = "force-dynamic";

// 자사 프로모션 정산 — 상단 [일일/주간]. ?period=daily|weekly & ?date=YYYY-MM-DD(기준일).
// 09~00시 완료건을 프로모션 개수로 집계, 주간 100건 초과분 × 2,000원 지급. (월간 미포함)
export default async function PromoSettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period === "weekly" ? "weekly" : "daily";
  const ref = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const { start, end } = period === "weekly" ? weekRangeOf(ref) : { start: ref, end: ref };

  const [data, notes, memos] = await Promise.all([
    fetchPromoSettlement(start, end, period === "weekly"),
    loadRiderNotes(),
    loadRiderMemos(),
  ]);
  return <PromoTabs data={data} period={period} today={kstToday()} notes={notes} memos={memos} />;
}
