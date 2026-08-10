// 커뮤니티 > 랭킹 — 등록 라이더 전체의 기간별(오늘/주간/월간) 완료건 순위.
// 기본 1~10위 + '모두 보기' 펼침. URL ?period 가 SSOT(탭은 RankingTabs).
// 데이터는 RPC get_rider_ranking(0016, DB 측 집계) — 스크래퍼 1분 주기라 매 요청 fresh.

import { Lock } from "lucide-react";
import { getRiderRanking } from "@/app/(rider)/_lib/ranking";
import { parsePeriod, PERIOD_LABEL } from "@/app/(rider)/_lib/metrics";
import { RANKING_LOCKED } from "@/lib/nav";
import { RankingTabs } from "./ranking-tabs";
import { RankingList } from "./ranking-list";

export const dynamic = "force-dynamic";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 잠금(2026-07-31) — 드로어는 터치 안내로 막지만 직접 URL 진입도 동일하게 차단.
  if (RANKING_LOCKED) {
    return (
      <div className="px-3.5 pb-10 pt-3.5">
        <h1 className="text-xl font-black tracking-[-0.03em]">랭킹</h1>
        <div className="mt-3 rounded-[12px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="flex flex-col items-center gap-2.5 py-10">
            <span className="grid size-11 place-items-center rounded-[12px] bg-jb-track text-jb-ink-mute">
              <Lock size={20} strokeWidth={1.8} />
            </span>
            <div className="text-center">
              <div className="text-[13.5px] font-bold text-jb-ink">현재 잠겨있습니다</div>
              <p className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
                오픈 준비 중이에요. 조금만 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
