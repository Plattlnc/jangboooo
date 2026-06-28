import type { GoalIcon } from "@/lib/mock/home";

// 시안 목표 카드의 피크 아이콘(여명/정오/저녁/심야) — CSS 아트 재현.

export function GoalIconArt({ icon }: { icon: GoalIcon }) {
  switch (icon) {
    case "dawn":
      return (
        <span className="flex flex-col items-center gap-0.5">
          <span className="h-[11px] w-[22px] rounded-t-[22px] bg-gradient-to-b from-[#fde047] to-[#f59e0b]" />
          <span className="h-0.5 w-6 rounded-sm bg-[#f59e0b]" />
        </span>
      );
    case "noon":
      return (
        <span className="size-5 rounded-full bg-gradient-to-br from-[#fde047] to-[#f59e0b] shadow-[0_0_0_3px_rgba(245,158,11,0.18)]" />
      );
    case "evening":
      return (
        <span className="flex items-end gap-0.5">
          <span className="h-[13px] w-[5px] rounded-[1px] bg-[#6366f1]" />
          <span className="h-[19px] w-[5px] rounded-[1px] bg-[#4f46e5]" />
          <span className="h-[10px] w-[5px] rounded-[1px] bg-[#818cf8]" />
        </span>
      );
    case "night":
      return (
        <span className="relative size-[18px]">
          <span className="absolute inset-0 rounded-full bg-[#818cf8]" />
          <span className="absolute -right-[3px] -top-0.5 size-[15px] rounded-full bg-[#e8eafe]" />
        </span>
      );
  }
}
