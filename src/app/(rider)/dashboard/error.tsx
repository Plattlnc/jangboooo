// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 대시보드 에러 경계 (Next.js error 컨벤션). 반드시 client component.

"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/feedback/error-state";

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
    <div className="py-8">
      <ErrorState
        title="대시보드를 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
