"use client";

import { cn } from "@/lib/cn";

// 01-component-library §B. role=tablist 세그먼트 탭 + 슬라이드 인디케이터.
// 값/onChange 제어형. URL 연동 등 동작은 래퍼(PeriodTabs)가 담당.
// variant: default(muted 트랙) / onPrimary(06 §C — primary 트랙·흰 pill).

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** 협소 화면용 짧은 라벨 */
  shortLabel?: string;
}

export type SegmentedVariant = "default" | "onPrimary";

interface SegmentedTabsProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  variant?: SegmentedVariant;
  className?: string;
}

const TRACK: Record<SegmentedVariant, string> = {
  default: "bg-muted",
  onPrimary: "bg-primary",
};
const PILL: Record<SegmentedVariant, string> = {
  default: "bg-card",
  onPrimary: "bg-card",
};
const TEXT: Record<SegmentedVariant, { on: string; off: string }> = {
  default: {
    on: "text-foreground font-bold",
    off: "text-muted-foreground hover:text-foreground",
  },
  onPrimary: {
    on: "text-primary-strong font-bold",
    off: "text-primary-foreground font-bold hover:opacity-85",
  },
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  variant = "default",
  className,
}: SegmentedTabsProps<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const pct = 100 / options.length;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("relative flex w-full rounded-full p-1", TRACK[variant], className)}
    >
      {/* 슬라이드 인디케이터 (활성 pill) */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-1 bottom-1 rounded-full shadow-xs transition-transform duration-[250ms] ease-[var(--ease-standard)]",
          PILL[variant],
        )}
        style={{
          width: `calc(${pct}% - 4px)`,
          left: 2,
          transform: `translateX(calc(${activeIndex} * (100% + 4px)))`,
        }}
      />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-[1] flex-1 touch-target rounded-full px-3 text-sm transition-colors duration-150 active:scale-[.98]",
              selected ? TEXT[variant].on : TEXT[variant].off,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
