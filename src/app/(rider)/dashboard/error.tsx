"use client";

// 대시보드 에러 경계 (Next.js error 컨벤션). 카피 SSOT: docs/copy/errors.md.
import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // PROVISIONAL: 관측성(로깅/모니터링) 연결은 devops/backend 결정 후.
    console.error(error);
  }, [error]);

  return (
    <div className="pt-8">
      <ErrorState
        title="잠깐 문제가 생겼어요"
        description="기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
