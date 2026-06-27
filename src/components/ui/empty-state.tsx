import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// 01-component-library §H. 빈 상태: 중립 아이콘 + 제목 + 설명 + 액션.
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** 인라인(카드 내부) 사용 시 패딩 축소 */
  compact?: boolean;
}

export function EmptyState({
  icon,
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
      {icon ? <div className="text-subtle">{icon}</div> : null}
      <p className="text-h3 text-fg">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
