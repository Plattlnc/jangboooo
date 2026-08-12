// 배달등급 — 주간(수~화) 누적 완료건 기준 등급. 보상 시스템 개편 중 — 건당 금액·수행건 표시 제거(2026-08-13).

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { TierBadge } from "@/components/ui/tier-badge";
import { TIERS } from "@/lib/grade";

/** 티어 컬러를 CSS 변수(--tier)로 — .tier-glow 아웃라인용. */
function tierVar(color: string): CSSProperties {
  return { "--tier": color } as CSSProperties;
}

export const dynamic = "force-dynamic";

export default async function GradePage() {
  const g = await getMyGrade();

  // 내 등급 혜택 — 수락률 유지 조건 충족 시에만 적용.
  const myPerks = g.tier.perks ?? [];
  const perkReq = g.tier.minAccept ?? null;
  const perksActive = myPerks.length > 0 && (perkReq == null || (g.acceptance != null && g.acceptance >= perkReq));

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="mb-3.5 text-xl font-black tracking-[-0.03em]">라이더 등급</h1>

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
        {myPerks.length > 0 ? (
          <div className="mt-3.5 border-t border-jb-line pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11.5px] font-bold text-jb-ink-mute">내 등급 혜택</span>
              {perkReq != null ? (
                perksActive ? (
                  <span className="rounded-full bg-jb-green-tint px-2 py-0.5 text-[10px] font-black text-jb-green">
                    적용 중 · 수락률 {g.acceptance}%
                  </span>
                ) : (
                  <span className="rounded-full bg-jb-red-tint px-2 py-0.5 text-[10px] font-black text-jb-red">
                    수락률 {g.acceptance ?? "—"}% · {perkReq}% 이상 유지 필요
                  </span>
                )
              ) : null}
            </div>
            <ul className="mt-2 flex flex-col gap-1.5">
              {myPerks.map((p) => (
                <li
                  key={p}
                  className={"flex items-center gap-1.5 text-[13px] font-black " + (perksActive ? "text-jb-ink" : "text-jb-ink-mute")}
                >
                  <Check size={15} strokeWidth={3} className={"shrink-0 " + (perksActive ? "text-jb-green" : "text-jb-ink-mute")} />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3.5 rounded-[10px] border-t border-jb-line bg-jb-surface px-3 py-2.5 text-[12px] font-bold text-jb-ink-soft">
            등급 보상은 현재 개편 중이에요
          </div>
        )}
      </div>

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
                "flex items-start gap-3 rounded-[12px] px-3.5 py-3 " +
                (current
                  ? "tier-glow bg-jb-card"
                  : "border border-jb-line bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]")
              }
            >
              <TierBadge tier={t} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[14px] font-black text-jb-ink">{t.name}</span>
                  {t.minAccept != null ? (
                    <span className="rounded-[6px] bg-jb-indigo-tint px-1.5 py-0.5 text-[10px] font-black text-jb-indigo">
                      수락률 {t.minAccept}%↑
                    </span>
                  ) : null}
                  {current ? (
                    <span className="rounded-[6px] px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: t.color }}>
                      현재
                    </span>
                  ) : null}
                </div>
                {t.perks && t.perks.length > 0 ? (
                  <ul className="mt-1.5 flex flex-col gap-1">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-center gap-1.5 text-[12px] font-bold text-jb-ink-soft">
                        <Check size={13} strokeWidth={3} className="shrink-0 text-jb-green" />
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-0.5 text-[11.5px] font-semibold text-jb-ink-mute">혜택 개편 중</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
