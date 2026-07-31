"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RankingEntry } from "@/app/(rider)/_lib/ranking";

// 랭킹 리스트 — 기본 1~10위, '모두 보기' 로 전체 펼침(데이터는 이미 서버에서 전달됨,
// 추가 fetch 없음). 행 = [프로필이미지] 이름 / 완료건수. 1~3위는 메달 틴트 배지.

const TOP = 10;

/** 1~3위 배지 틴트(금/은/동), 그 외 muted 숫자. */
const MEDAL: Record<number, { bg: string; color: string }> = {
  1: { bg: "#fbf3dd", color: "#B8860B" },
  2: { bg: "#eef0f3", color: "#5b6660" },
  3: { bg: "#fdf0e6", color: "#b05c22" },
};

function initialOf(name: string): string {
  return name.trim().slice(0, 1) || "라";
}

function Row({ entry }: { entry: RankingEntry }) {
  const medal = MEDAL[entry.rank];
  return (
    <div className="flex items-center gap-3 border-t border-jb-line-soft py-2.5 first:border-t-0">
      {/* 순위 배지 */}
      <span
        className="tnum grid size-7 shrink-0 place-items-center rounded-[9px] text-[13px] font-black"
        style={medal ? { background: medal.bg, color: medal.color } : undefined}
      >
        {medal ? entry.rank : <span className="text-jb-ink-mute">{entry.rank}</span>}
      </span>
      {/* 프로필 이미지 / 이니셜 */}
      {entry.avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element -- 36px 고정 아바타, 원격 도메인 미설정 */
        <img
          src={entry.avatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-[11px] object-cover"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-[#eef1fe] text-[14px] font-black text-jb-indigo">
          {initialOf(entry.name)}
        </span>
      )}
      {/* 이름 */}
      <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-jb-ink">{entry.name}</span>
      {/* 완료건수 */}
      <span className="tnum shrink-0 text-[14px] font-black text-jb-ink">
        {entry.completed.toLocaleString("ko-KR")}
        <span className="ml-0.5 text-[11.5px] font-semibold text-jb-ink-mute">건</span>
      </span>
    </div>
  );
}

export function RankingList({ entries }: { entries: RankingEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? entries : entries.slice(0, TOP);
  const hasMore = entries.length > TOP;

  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="py-9 text-center">
          <div className="text-[13.5px] font-bold text-jb-ink">아직 집계된 기록이 없어요</div>
          <p className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
            배달이 집계되면 순위가 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-jb-line bg-white px-4 py-1.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
      {visible.map((e) => (
        <Row key={e.uid} entry={e} />
      ))}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className={cn(
            "flex w-full items-center justify-center gap-1 border-t border-jb-line-soft py-3",
            "text-[13px] font-bold text-jb-indigo transition-transform active:scale-[.98]",
          )}
        >
          {showAll ? (
            <>
              접기 <ChevronUp size={15} strokeWidth={2.4} />
            </>
          ) : (
            <>
              모두 보기 ({entries.length}명) <ChevronDown size={15} strokeWidth={2.4} />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
