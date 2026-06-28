import { cn } from "@/lib/cn";
import type { LiveTone } from "@/app/(rider)/_lib/metrics";

// 06 §B. 인사 + 날짜·시각(우상) + 라이브 상태(우). 카피 SSOT: dashboard.md §1·§6.
interface GreetingBlockProps {
  name: string;
  /** 사전 포맷된 날짜·시각 문자열 (서버에서 TZ 정확히 계산). */
  dateText: string;
  live: { label: string; tone: LiveTone };
}

export function GreetingBlock({ name, dateText, live }: GreetingBlockProps) {
  return (
    <header className="flex items-start justify-between gap-3 pt-4">
      <h1 className="text-[20px] font-bold leading-[1.19] text-foreground">
        <span className="font-bold">{name}</span>님, 오늘도 안전 운행해요!
      </h1>
      <div className="flex shrink-0 flex-col items-end gap-1 pt-1">
        <p className="text-[10px] text-text-muted-strong">{dateText}</p>
        <p
          className="flex items-center gap-1 text-[10px] text-text-muted-strong"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={cn(
              "inline-block size-1.5 rounded-full",
              live.tone === "live" ? "bg-live motion-safe:animate-pulse" : "bg-text-muted-strong",
            )}
          />
          {live.label}
        </p>
      </div>
    </header>
  );
}
