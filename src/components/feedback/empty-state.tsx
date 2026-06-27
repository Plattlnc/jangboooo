// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 중립 스타일 셸. 토큰/팔레트 미사용.

import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** 데이터 없음 상태 셸. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center"
    >
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-xs text-sm opacity-70">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
