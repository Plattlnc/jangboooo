// 대시보드 로딩 스켈레톤 (Next.js loading 컨벤션).
// DESIGN-QA m3: 실제 레이아웃과 높이·줄수 일치(CLS 0).
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 pt-4">
      {/* DashboardHeader: 인사 + 갱신 + 주기안내 3줄 */}
      <div className="flex flex-col gap-1">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-52" />
      </div>

      {/* PeriodTabs */}
      <Skeleton className="h-12 w-full rounded-full" />

      {/* SlaScore (rounded-2xl, 게이지 포함) */}
      <Skeleton className="h-[340px] w-full rounded-2xl" />

      {/* StatGrid: 2열 4개 + 수락률 풀폭 (base 기준) */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
        <Skeleton className="col-span-2 h-24 w-full rounded-xl md:col-span-1" />
      </section>

      {/* PeakHourChart */}
      <Skeleton className="h-56 w-full rounded-xl" />

      {/* FooterActions */}
      <div className="flex justify-center gap-2 pb-8 pt-2">
        <Skeleton className="h-11 w-28 rounded-md" />
        <Skeleton className="h-11 w-36 rounded-md" />
      </div>
    </div>
  );
}
