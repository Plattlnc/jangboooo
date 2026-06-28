// 대시보드 로딩 스켈레톤 (Next.js loading 컨벤션). 실제 레이아웃과 높이 일치(CLS 0).
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* GreetingBlock: 인사 + 날짜/상태 */}
      <div className="flex items-start justify-between gap-3 pt-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-col items-end gap-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* PeriodTabs */}
      <Skeleton className="h-[50px] w-full rounded-full" />

      {/* AcceptanceGauge 카드 */}
      <Skeleton className="h-[225px] w-full rounded-card25" />

      {/* StatCards: 3개 정사각 */}
      <div className="grid grid-cols-3 gap-3 sm:gap-[25px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-card25" />
        ))}
      </div>

      {/* PeakCard */}
      <Skeleton className="h-40 w-full rounded-card25" />

      {/* GoalCard */}
      <Skeleton className="h-40 w-full rounded-card25" />

      {/* RefreshButton (우정렬) */}
      <div className="flex justify-end pb-8 pt-1">
        <Skeleton className="h-11 w-28 rounded-md" />
      </div>
    </div>
  );
}
