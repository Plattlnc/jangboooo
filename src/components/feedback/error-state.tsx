// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 중립 스타일 셸. 토큰/팔레트 미사용.

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** 에러 상태 셸. error boundary 또는 인라인에서 재사용. */
export function ErrorState({
  title = "문제가 발생했어요",
  description = "잠시 후 다시 시도해 주세요.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border p-8 text-center"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm opacity-70">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border px-3 py-1.5 text-sm font-medium"
        >
          다시 시도
        </button>
      ) : null}
    </div>
  );
}
