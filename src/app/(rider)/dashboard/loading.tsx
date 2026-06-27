// 대시보드 로딩 스켈레톤 (Next.js loading 컨벤션). 레이아웃 동일·시프트 0.
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 pt-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-card" />
        ))}
      </section>
      <Skeleton className="h-44 w-full rounded-card" />
    </div>
  );
}
