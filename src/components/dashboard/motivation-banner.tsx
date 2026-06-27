import { cn } from "@/lib/utils";

// 03 §D. 조건부 동기부여 — 과거의 나 대비(다른 라이더 비교 금지). 과하지 않게 1개.
// 카피 SSOT: docs/copy/dashboard.md §6. 05 §4: tossface 액센트(호조 💪 / 회복여지 🌱).
interface MotivationBannerProps {
  tone: "success" | "warning";
  message: string;
}

export function MotivationBanner({ tone, message }: MotivationBannerProps) {
  const emoji = tone === "success" ? "💪" : "🌱";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md p-3 text-sm",
        tone === "success" ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning",
      )}
    >
      <span aria-hidden="true" className="emoji shrink-0 text-base">{emoji}</span>
      <span>{message}</span>
    </div>
  );
}
