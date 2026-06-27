import { cn } from "@/lib/cn";
import { formatUpdatedAt } from "@/app/(rider)/_lib/metrics";

// 03 §A. 인사 + 마지막 갱신. 카피 SSOT: docs/copy/dashboard.md §1.
interface DashboardHeaderProps {
  name: string;
  lastCapturedAt: string | null;
}

export function DashboardHeader({ name, lastCapturedAt }: DashboardHeaderProps) {
  const { text, stale } = formatUpdatedAt(lastCapturedAt);

  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-h3 text-fg">{name}님, 오늘도 안전 운행해요</h1>
      <p className="flex items-center gap-1.5 text-caption text-muted" aria-live="polite">
        <span
          aria-hidden="true"
          className={cn(
            "inline-block size-1.5 rounded-full",
            stale ? "bg-warning" : "bg-success motion-safe:animate-pulse",
          )}
        />
        {text}
      </p>
      <p className="text-caption text-subtle">기록은 1분마다 자동으로 새로워져요</p>
    </header>
  );
}
