import type { ReactNode } from "react";

// 정산 전 화면 공용 헤더 — 타이틀(위치·크기·굵기·간격) 일관화.
// title 좌측 고정 · badge 칩 · subtitle 아래 · actions 우측(주 이동/버튼/CSV 등).
export function SettlementHeader({
  title,
  badge,
  subtitle,
  actions,
}: {
  title: string;
  badge?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-black leading-tight tracking-[-0.02em] text-jb-ink">{title}</h1>
          {badge ? (
            <span className="rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[11px] font-bold leading-none text-jb-indigo">
              {badge}
            </span>
          ) : null}
        </div>
        {subtitle ? <p className="mt-1 text-[13px] text-jb-ink-mute">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
