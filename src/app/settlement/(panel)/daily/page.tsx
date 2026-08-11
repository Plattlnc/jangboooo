import { fetchDailySettlement } from "@/app/settlement/_lib/daily";
import { kstToday, kstYesterday, isValidYmd } from "@/app/settlement/_lib/dates";
import { DailySettlementView } from "@/components/settlement/daily-view";

export const dynamic = "force-dynamic";

// 일일 정산 — ?date=YYYY-MM-DD (기본: 어제, 배달처리비 T+1). 라이더별 배달처리비 목록 → 송금 기반.
export default async function DailySettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const data = await fetchDailySettlement(date);
  return <DailySettlementView data={data} today={kstToday()} />;
}
