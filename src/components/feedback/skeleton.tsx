// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 중립 스타일 셸. 토큰/팔레트 미사용 — uxui 명세 도착 후 디자인 적용.

interface SkeletonProps {
  className?: string;
}

/** 로딩 자리표시용 중립 블록. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-black/10 dark:bg-white/10 ${className}`}
    />
  );
}
