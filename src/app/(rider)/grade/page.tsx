// 배달등급 — 주간(수~화) 누적 완료건 기준 등급. 보상 시스템 개편 중 — 건당 금액·수행건 표시 제거(2026-08-13).

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { TierBadge } from "@/components/ui/tier-badge";
import { seasonOf, TIERS } from "@/lib/grade";

/** 티어 컬러를 CSS 변수(--tier)로 — .tier-glow 아웃라인용. */
function tierVar(color: string): CSSProperties {
  return { "--tier": color } as CSSProperties;
}

export const dynamic = "force-dynamic";

export default async function GradePage() {
  const g = await getMyGrade();

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const season = seasonOf(today);
  const seasonOpen = season.number != null;

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black tracking-[-0.03em]">라이더 등급</h1>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[11px] font-black " +
            (seasonOpen ? "bg-jb-indigo-tint text-jb-indigo" : "bg-jb-track text-jb-ink-mute")
          }
        >
          {seasonOpen ? `시즌 ${season.number}` : "시즌 미오픈"}
        </span>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주간(수~화) 실적 기준 등급</p>

      {/* 최상위 카드 — 현재 등급(티어 컬러 아웃라인) */}
      <div className="tier-glow rounded-2xl bg-jb-card px-[18px] py-[17px]" style={tierVar(g.tier.color)}>
        <div className="flex items-center gap-3">
          <TierBadge tier={g.tier} size={48} />
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-jb-ink-soft">
              <span className="font-black text-jb-ink">{g.name}</span>님 현재
            </div>
            <div className="text-[22px] font-black leading-tight tracking-[-0.02em]">
              <span style={{ color: g.tier.color }}>{g.tier.name}</span>
              <span className="text-jb-ink"> 입니다</span>
            </div>
          </div>
        </div>
        <div className="mt-3.5 rounded-[10px] border-t border-jb-line bg-jb-surface px-3 py-2.5 text-[12px] font-bold text-jb-ink-soft">
          등급 보상은 현재 개편 중이에요
        </div>
      </div>

      {/* 내 등급 기록 */}
      <Link
        href="/grade/history"
        className="mt-3 flex items-center gap-2 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
      >
        <span className="flex-1 text-[13.5px] font-black text-jb-ink">내 등급 기록</span>
        <span className="text-[11.5px] font-semibold text-jb-ink-mute">주차별 등급</span>
        <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
      </Link>

      {/* 등급 목록 */}
      <div className="mb-2 mt-5 text-[15px] font-black text-jb-ink">등급</div>
      <div className="space-y-2">
        {[...TIERS].reverse().map((t) => {
          const current = t.key === g.tier.key;
          return (
            <div
              key={t.key}
              style={current ? tierVar(t.color) : undefined}
              className={
                "flex items-center gap-3 rounded-[12px] px-3.5 py-3 " +
                (current
                  ? "tier-glow bg-jb-card"
                  : "border border-jb-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]")
              }
            >
              <TierBadge tier={t} size={40} />
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="text-[14px] font-black text-jb-ink">{t.name}</span>
                {current ? (
                  <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: t.color }}>
                    현재
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
