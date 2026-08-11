// 배달등급 — 주간(수~화) 누적 완료건 기준 7등급 + 구간별 누진 프로모션 보상.
// 최상위 카드(현재 등급·실시간 보상·승급 안내) + 구간별 내역 + 등급 조건표.

import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { TierBadge } from "@/components/ui/tier-badge";
import { seasonOf, TIERS, type Tier } from "@/lib/grade";

/** 티어 컬러를 CSS 변수(--tier)로 — .tier-glow 아웃라인용. */
function tierVar(color: string): CSSProperties {
  return { "--tier": color } as CSSProperties;
}

export const dynamic = "force-dynamic";

function rangeLabel(t: Tier): string {
  return t.max === Infinity ? `${t.min}건 이상` : `${t.min}~${t.max}건`;
}

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
        <h1 className="text-xl font-black tracking-[-0.03em]">배달등급</h1>
        <span
          className={
            "rounded-full px-2 py-0.5 text-[11px] font-black " +
            (seasonOpen ? "bg-jb-indigo-tint text-jb-indigo" : "bg-jb-track text-jb-ink-mute")
          }
        >
          {seasonOpen ? `시즌 ${season.number}` : "시즌 미오픈"}
        </span>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">주간(수~화) 누적 완료건 기준 · 구간별 누진 보상</p>

      {/* 최상위 카드 — 티어 컬러 빛나는 아웃라인(배경색 없음) */}
      <div className="tier-glow rounded-2xl bg-jb-card px-[18px] py-[17px]" style={tierVar(g.tier.color)}>
        <div className="flex items-center gap-3">
          <TierBadge tier={g.tier} size={48} />
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold text-jb-ink-soft">
              <span className="font-black text-jb-ink">{g.name}</span>님, 현재
            </div>
            <div className="text-[22px] font-black leading-tight tracking-[-0.02em]" style={{ color: g.tier.color }}>
              {g.tier.name}
            </div>
          </div>
        </div>

        {seasonOpen ? (
          <>
            <div className="mt-3.5 border-t border-jb-line pt-3">
              <div className="text-[11.5px] font-semibold text-jb-ink-mute">현재 예정 등급 보상</div>
              <div className="tnum mt-0.5 text-[27px] font-black leading-none tracking-[-0.02em] text-jb-green">
                {g.reward.toLocaleString("ko-KR")}
                <span className="ml-1 text-[16px] font-bold text-jb-ink-mute">원</span>
                <span className="ml-2 text-[12.5px] font-bold text-jb-ink-mute">총 {g.completed.toLocaleString("ko-KR")}건</span>
              </div>
            </div>
            <div className="mt-3 rounded-[10px] bg-jb-surface px-3 py-2 text-[12px] font-bold text-jb-ink">
              {g.nextTier ? (
                <>
                  <span className="tnum">{g.toNext.toLocaleString("ko-KR")}</span>건 완료 시,{" "}
                  <span className="font-black" style={{ color: g.nextTier.color }}>
                    {g.nextTier.name}
                  </span>
                  으로 승급합니다
                </>
              ) : (
                <>최고 등급입니다 🎉</>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3.5 border-t border-jb-line pt-3">
            <div className="tnum text-[13px] font-bold text-jb-ink">이번 주 완료 {g.completed.toLocaleString("ko-KR")}건</div>
            <div className="mt-2.5 rounded-[10px] bg-jb-surface px-3 py-2 text-[12px] font-bold text-jb-ink-soft">
              시즌이 열리면 등급 보상이 집계됩니다
            </div>
          </div>
        )}
      </div>

      {/* 구간별 누진 보상 내역 — 시즌 오픈 시에만 */}
      {seasonOpen && g.breakdown.length > 0 ? (
        <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-1 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          {g.breakdown.map((b) => (
            <div
              key={b.tier.key}
              className="flex items-center justify-between border-t border-jb-line-soft py-2.5 text-[12.5px] first:border-t-0"
            >
              <span className="flex items-center gap-2 font-bold text-jb-ink">
                <span className="size-2 rounded-full" style={{ background: b.tier.color }} />
                {b.tier.name}
                <span className="tnum font-semibold text-jb-ink-mute">
                  {b.count.toLocaleString("ko-KR")}건 × {b.tier.rate.toLocaleString("ko-KR")}원
                </span>
              </span>
              <span className="tnum font-black text-jb-green">{b.amount.toLocaleString("ko-KR")}원</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-jb-line py-2.5 text-[13px] font-black">
            <span className="text-jb-ink">합계</span>
            <span className="tnum text-jb-green">{g.reward.toLocaleString("ko-KR")}원</span>
          </div>
        </div>
      ) : null}

      {/* 내 등급 기록 */}
      <Link
        href="/grade/history"
        className="mt-3 flex items-center gap-2 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
      >
        <span className="flex-1 text-[13.5px] font-black text-jb-ink">내 등급 기록</span>
        <span className="text-[11.5px] font-semibold text-jb-ink-mute">주차별 등급·보상</span>
        <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
      </Link>

      {/* 등급 조건 */}
      <div className="mb-2 mt-5 text-[15px] font-black text-jb-ink">등급 조건</div>
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-black text-jb-ink">{t.name}</span>
                  {current ? (
                    <span
                      className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-black text-white"
                      style={{ background: t.color }}
                    >
                      현재
                    </span>
                  ) : null}
                </div>
                <div className="tnum mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">{rangeLabel(t)}</div>
              </div>
              <span className={"tnum shrink-0 text-[13px] font-black " + (t.rate > 0 ? "text-jb-ink" : "text-jb-ink-mute")}>
                {t.rate > 0 ? `건당 ${t.rate.toLocaleString("ko-KR")}원` : "보상 없음"}
              </span>
            </div>
          );
        })}
      </div>

      {/* 설명 */}
      <div className="mt-4 rounded-[12px] bg-jb-surface px-4 py-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
        주간(수요일~화요일) 누적 완료건에 따라 등급이 정해집니다. 보상은 <b>각 구간의 초과분에만</b> 해당 단가가 가산되는{" "}
        <b>누진 방식</b>이라, 등급이 올라가도 이전 구간의 단가는 그대로 유지됩니다. (예: 220건 → 101~150건 150원 + 151~200건
        600원 + 201~220건 900원 합산)
      </div>

      {/* 출석체크 */}
      <Link
        href="/grade/attendance"
        className="mt-3 flex items-center gap-2 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
      >
        <span className="flex-1 text-[13.5px] font-black text-jb-ink">출석체크</span>
        <span className="text-[11.5px] font-semibold text-jb-ink-mute">주간 30건당 1회 · 5회 35,000원</span>
        <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
      </Link>
    </div>
  );
}
