// PROVISIONAL: uxui 명세 / backend 계약 도착 후 교체
// 대시보드 로딩 스켈레톤 (Next.js loading 컨벤션). 중립 클래스만.

import { Skeleton } from "@/components/feedback/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </section>
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
