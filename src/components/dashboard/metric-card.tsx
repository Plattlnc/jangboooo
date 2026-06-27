// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 지표 카드 셸. 토큰/팔레트/차트 스타일 미확정 — 중립 클래스만.

import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  /** 보조 설명/단위 (선택). */
  hint?: string;
}

/** 단일 지표 표시 셸 (SLA 점수, 완료/거절 등). */
export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <span className="text-sm opacity-70">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-xs opacity-60">{hint}</span> : null}
    </div>
  );
}
