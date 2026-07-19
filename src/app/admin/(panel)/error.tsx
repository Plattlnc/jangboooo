"use client";

// 관리자 영역 에러 경계 — 대시보드 error.tsx 와 동일 컨벤션.
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="pt-8">
      <ErrorState
        title="잠깐 문제가 생겼어요"
        description="관리자 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
