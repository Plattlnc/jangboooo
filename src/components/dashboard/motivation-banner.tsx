import { cn } from "@/lib/cn";
import { TrendUp, Clock } from "@/components/ui/icons";

// 03 §D. 조건부 동기부여 — 과거의 나 대비(다른 라이더 비교 금지). 과하지 않게 1개.
// 카피 SSOT: docs/copy/dashboard.md §6.
interface MotivationBannerProps {
  tone: "success" | "warning";
  message: string;
}

export function MotivationBanner({ tone, message }: MotivationBannerProps) {
  // DESIGN-QA m7: 호조=상승(↗), 회복여지(warning)=남은시간(시계). ↗ 의미충돌 방지.
  const Icon = tone === "success" ? TrendUp : Clock;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md p-3 text-sm",
        tone === "success" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning",
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}
