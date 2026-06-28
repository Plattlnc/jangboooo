"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import type { CenterGoalRow } from "@/types/database";

// 06 §F-2. 공동목표 달성현황 — PeakCard 와 동일 카드(컨테이너/타이포/간격/색).
// 차이: 값 = "현재/목표 (pct%)". 계약: docs/api/center-goals.md.
// pct 는 backend 소스값(0~100, 100 상한) 그대로 사용 — current/goal 재계산 금지.

/** 값 텍스트: 데이터 없음→"—", 목표 미설정(goal 0)→"{현재}/0 (—)", 정상→"{현재}/{목표} ({pct}%)". */
function valueText(g: CenterGoalRow): string {
  if (g.current == null || g.goal == null) return "—";
  if (g.goal === 0) return `${g.current}/0 (—)`;
  return `${g.current}/${g.goal} (${g.pct ?? "—"}%)`;
}

/** 진행바 width(%) — pct 소스값을 0~100 으로 클램프. null/미설정 → 0. */
function barWidth(g: CenterGoalRow): number {
  return g.pct == null ? 0 : Math.min(100, Math.max(0, g.pct));
}

function ariaLabel(g: CenterGoalRow): string {
  if (g.current == null || g.goal == null) return `${g.label} 목표 데이터 없음`;
  if (g.goal === 0) return `${g.label} 목표 미설정 (현재 ${g.current}건)`;
  return `${g.label} 목표 ${g.goal}건 중 ${g.current}건 달성 (${g.pct ?? 0}%)`;
}

export function GoalCard({ goals }: { goals: CenterGoalRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <section
      aria-label="공동목표 달성현황"
      className="flex flex-col gap-3 rounded-card25 border border-surface-card-border bg-surface-card p-5"
    >
      <h2 className="text-sm font-bold text-text-secondary">공동목표 달성현황</h2>

      {goals.length === 0 ? (
        <p className="py-2 text-sm text-text-muted-strong">아직 공동목표가 없어요</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {goals.map((g, i) => {
            const width = barWidth(g);
            // 달성(소스 pct ≥ 100): 진행/값 success 색. "(100%)" 텍스트가 색 외 신호 겸함.
            const achieved = g.pct != null && g.pct >= 100;
            return (
              <li key={g.peak_key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-semibold text-text-muted-strong">
                  {g.label}
                </span>
                <div
                  className="h-2.5 flex-1 overflow-hidden rounded-full bg-bar-track"
                  role="img"
                  aria-label={ariaLabel(g)}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-standard)]",
                      achieved ? "bg-success" : "bg-primary",
                    )}
                    style={{ width: mounted ? `${width}%` : "0%", transitionDelay: `${i * 60}ms` }}
                  />
                </div>
                <span
                  className={cn(
                    "w-28 shrink-0 whitespace-nowrap text-right text-xs font-bold",
                    achieved ? "text-success" : "text-primary-strong",
                  )}
                >
                  {valueText(g)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
