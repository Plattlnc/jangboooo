"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { gaugeBand, type GaugeBand } from "@/app/(rider)/_lib/metrics";

// 06 §D. 수락률 원형 게이지(메인 지표). 트랙(primary 10%) + 진행(밴드색, 6시 시작 시계방향).
// 텍스트/숫자는 AA 안전색(-text), 링 fill 은 Figma 원색. 카피 SSOT: dashboard.md §3.

const R = 70;
const C = 2 * Math.PI * R; // ≈ 439.82

const BAND: Record<GaugeBand, { ring: string; text: string }> = {
  high: { ring: "stroke-gauge-high", text: "text-gauge-high-text" },
  mid: { ring: "stroke-gauge-mid", text: "text-gauge-mid-text" },
  low: { ring: "stroke-gauge-low", text: "text-gauge-low-text" },
};

interface AcceptanceGaugeProps {
  /** 수락률 0~100. null = 미수집 → 중앙 "—". */
  rate: number | null;
  label: string;
  note?: string | null;
  /** 불러오기 실패 시 안내(라벨 아래). */
  errorText?: string;
}

function formatPct(value: number): string {
  // 배민 앱 표기와 동일하게 정수 반올림 — 소수는 표시하지 않는다.
  return `${Math.round(value)}%`;
}

export function AcceptanceGauge({ rate, label, note, errorText }: AcceptanceGaugeProps) {
  const value = rate == null ? null : Math.max(0, Math.min(100, rate));
  const frac = (value ?? 0) / 100;
  const band = BAND[gaugeBand(value ?? 0)];

  // 마운트/값변경 시 채움 애니메이션(stroke-dashoffset). reduced-motion 은 globals 가드로 즉시.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(frac));
    return () => cancelAnimationFrame(id);
  }, [frac]);

  const display = value == null ? "—" : formatPct(value);

  return (
    <section
      aria-label={`${label} ${display}`}
      className="flex flex-col gap-2 rounded-card25 border border-surface-card-border bg-surface-card p-5"
    >
      <h2 className="text-sm font-bold text-text-secondary">{label}</h2>
      {errorText ? <p className="text-sm text-muted-foreground">{errorText}</p> : null}

      <div className="relative mx-auto my-2 aspect-square w-40 max-w-full">
        <svg viewBox="0 0 160 160" className="h-full w-full" role="presentation">
          <circle
            cx={80}
            cy={80}
            r={R}
            fill="none"
            strokeWidth={12}
            className="stroke-gauge-track"
          />
          <circle
            cx={80}
            cy={80}
            r={R}
            fill="none"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - shown)}
            className={cn(band.ring, "transition-[stroke-dashoffset] duration-[600ms] ease-[var(--ease-emphasized)]")}
            style={{ transform: "rotate(90deg)", transformOrigin: "center" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-[24px] font-bold leading-none", band.text)}>
            {display}
          </span>
        </div>
      </div>

      {note ? <p className="text-center text-sm text-text-secondary">{note}</p> : null}
    </section>
  );
}
