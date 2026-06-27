import { cn } from "@/lib/cn";
import { Alert } from "./icons";
import { Button } from "./button";

// 01-component-library §H. 에러 상태: 경고 아이콘 + 제목 + 설명 + 재시도(secondary).
// 카피 SSOT: docs/copy/errors.md.
interface ErrorStateProps {
  title?: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = "잠깐 문제가 생겼어요",
  description = "기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  retryLabel = "다시 시도",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-6" : "gap-3 py-10",
        className,
      )}
    >
      <Alert className="text-danger" size={28} />
      <p className="text-h3 text-fg">{title}</p>
      <p className="max-w-xs text-sm text-muted">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="md" className="mt-1" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
