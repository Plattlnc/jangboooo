import { fetchDailySettlement } from "@/app/settlement/_lib/daily";
import { loadSettlementMemo } from "@/app/settlement/_lib/memo";
import { kstToday, kstYesterday, isValidYmd } from "@/app/settlement/_lib/dates";
import { DailyTabs } from "@/components/settlement/daily-tabs";

export const dynamic = "force-dynamic";

// 일일 정산 — ?date=YYYY-MM-DD (기본: 어제, 배달처리비 T+1). [정산 내역] 테이블 + [기타] 메모.
export default async function DailySettlementPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  const date = isValidYmd(sp.date) ? sp.date : kstYesterday();
  const [data, memo] = await Promise.all([fetchDailySettlement(date), loadSettlementMemo()]);
  return <DailyTabs data={data} today={kstToday()} memo={memo.content} />;
}
