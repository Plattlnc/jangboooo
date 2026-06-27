"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoTip } from "@/components/ui/info-tip";
import { slaGrade, type StatusColor } from "@/app/(rider)/_lib/metrics";

// 03 §C / 01 §D. 메인 SLA 점수 — 원형 게이지 + 카운트업. reduced-motion 시 즉시 최종값.

const RING = { size: 180, stroke: 14 };
const R = (RING.size - RING.stroke) / 2;
const CIRC = 2 * Math.PI * R;

const STROKE: Record<StatusColor, string> = {
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-destructive",
};
const TEXT: Record<StatusColor, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

interface SlaScoreProps {
  /** 0–100, 데이터 없으면 null */
  score: number | null;
  periodLabel: string;
}

export function SlaScore({ score, periodLabel }: SlaScoreProps) {
  // 카운트업 시작값: reduced-motion 이면 최종값, 아니면 0 에서 시작.
  const [display, setDisplay] = useState(() =>
    score != null && prefersReducedMotion() ? score : 0,
  );
  // 기간 전환 등 score 변경 시 render-phase 로 재시작 (effect setState 회피, React 19).
  const [prevScore, setPrevScore] = useState(score);
  if (score !== prevScore) {
    setPrevScore(score);
    setDisplay(score != null && prefersReducedMotion() ? score : 0);
  }

  useEffect(() => {
    if (score == null || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const dur = 600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(score * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  if (score == null) {
    return (
      <section className="bg-card rounded-2xl shadow-md p-6">
        <ScoreLabel />
        <EmptyState
          compact
          title={`아직 ${periodLabel} 기록이 없어요`}
          description="첫 콜 받으면 여기 채워져요."
        />
      </section>
    );
  }

  const { label, status } = slaGrade(score);
  const offset = CIRC * (1 - display / 100);

  return (
    <section
      className="bg-card rounded-2xl shadow-md p-6 flex flex-col items-center gap-4"
      aria-label={`SLA 점수 ${score}점, ${label}`}
    >
      <ScoreLabel />
      <div className="relative grid place-items-center" style={{ width: RING.size, height: RING.size }}>
        <svg width={RING.size} height={RING.size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={RING.size / 2} cy={RING.size / 2} r={R}
            className="stroke-border" strokeWidth={RING.stroke} fill="none"
          />
          <circle
            cx={RING.size / 2} cy={RING.size / 2} r={R}
            className={STROKE[status]} strokeWidth={RING.stroke} fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute flex items-baseline gap-1">
          <span className={cn("text-score tabular-nums", TEXT[status])}>{display}</span>
          <span className="text-h2 text-muted-foreground">점</span>
        </div>
      </div>
      <Badge variant={status}>{label}</Badge>
      <p className="text-caption text-muted-foreground text-center">
        이 숫자는 평가가 아니라 내 기록이에요.
      </p>
    </section>
  );
}

function ScoreLabel() {
  return (
    <div className="flex items-center justify-center gap-1 text-caption text-muted-foreground">
      <span aria-hidden="true" className="emoji">🛡️</span>
      <span>SLA 점수</span>
      <InfoTip
        label="SLA 점수 설명"
        size={16}
        text="배달을 약속대로 잘 해낸 정도를 나타내는 종합 신뢰 점수예요. (배달 신뢰도 점수)"
      />
    </div>
  );
}
