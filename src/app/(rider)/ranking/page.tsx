// 커뮤니티 > 랭킹 — 등록 라이더 전체의 기간별(오늘/주간/월간) 완료건 순위.
// 기본 1~10위 + '모두 보기' 펼침. URL ?period 가 SSOT(탭은 RankingTabs).
// 데이터는 RPC get_rider_ranking(0016, DB 측 집계) — 스크래퍼 1분 주기라 매 요청 fresh.

import { getRiderRanking } from "@/app/(rider)/_lib/ranking";
import { parsePeriod, PERIOD_LABEL } from "@/app/(rider)/_lib/metrics";
import { RankingTabs } from "./ranking-tabs";
import { RankingList } from "./ranking-list";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const entries = await getRiderRanking(period);

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">랭킹</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">
        {PERIOD_LABEL[period]} 배달 완료 건수 순위
      </p>

      <RankingTabs active={period} />

      <div className="mt-3">
        <RankingList entries={entries} />
      </div>
    </div>
  );
}
