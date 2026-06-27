import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// 01 §H / 05 §4. 빈 상태: tossface 📭(또는 커스텀 아이콘) + 제목 + 설명 + 액션.
interface EmptyStateProps {
  /** 커스텀 아이콘(있으면 이모지 대신 사용) */
  icon?: ReactNode;
  /** tossface 액센트(아이콘 없을 때). 기본 📭. null 이면 미표시 */
  emoji?: string | null;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** 인라인(카드 내부) 사용 시 패딩 축소 */
  compact?: boolean;
}

export function EmptyState({
  icon,
  emoji = "📭",
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-6" : "gap-3 py-10",
        className,
      )}
    >
      {icon ? (
        <div className="text-muted-foreground">{icon}</div>
      ) : emoji ? (
        <span aria-hidden="true" className="emoji text-2xl">{emoji}</span>
      ) : null}
      <p className="text-h3 text-foreground">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
