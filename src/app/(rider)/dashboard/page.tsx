// PROVISIONAL: uxui 명세 / backend fetch 레이어 도착 후 교체
// 대시보드 페이지 셸. searchParams(period) 기반 기간 전환.
// 타입은 backend 실스키마(RiderSummaryRow/RiderHourlyRow) 사용, 데이터는 _lib/queries 목 스텁.
// 디자인 토큰/차트 라이브러리 미확정 — 구조 + 중립 클래스만.

import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { MetricCard } from "@/components/dashboard/metric-card";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  getDashboardData,
  parsePeriod,
  PERIOD_LABELS,
} from "@/app/(rider)/_lib/queries";

// Next 16: searchParams 는 비동기.
interface DashboardPageProps {
  searchParams: Promise<{ period?: string | string[] }>;
}

function formatRate(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const { summary, hourly } = await getDashboardData(period);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          {PERIOD_LABELS[period]} 실적
        </h1>
        <PeriodTabs active={period} />
      </div>

      {/* 핵심 지표 그리드 */}
      <section
        aria-label="SLA 지표"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <MetricCard
          label="SLA 점수"
          value={summary.sla_score == null ? "—" : summary.sla_score}
        />
        <MetricCard label="완료" value={summary.completed} />
        <MetricCard label="거절" value={summary.rejected} />
        <MetricCard label="배차취소" value={summary.dispatch_canceled} />
        <MetricCard label="배달취소" value={summary.delivery_canceled} />
        <MetricCard
          label="수락률"
          value={formatRate(summary.acceptance_rate)}
          hint={`배차 ${summary.assigned}건 기준`}
        />
      </section>

      {/* 피크 시간대 — 차트 라이브러리 확정 전 자리표시 */}
      <section aria-label="피크 시간대" className="flex flex-col gap-2">
        <h2 className="text-sm font-medium opacity-70">피크 시간대</h2>
        {hourly.length === 0 ? (
          <EmptyState
            title="표시할 데이터가 없어요"
            description="해당 기간에 집계된 실적이 아직 없습니다."
          />
        ) : (
          <div className="rounded-lg border p-4">
            {/* PROVISIONAL: uxui 차트 스타일/라이브러리 확정 후 교체. 임시 막대 표현. */}
            <ul className="flex h-32 items-end gap-0.5" aria-hidden="true">
              {hourly.map((bucket) => {
                const max = Math.max(...hourly.map((b) => b.completed), 1);
                const heightPct = Math.round((bucket.completed / max) * 100);
                return (
                  <li
                    key={bucket.hour}
                    className="flex-1 rounded-sm bg-black/20 dark:bg-white/20"
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </ul>
            <p className="mt-2 text-xs opacity-50">0시 → 23시 (임시 시각화)</p>
          </div>
        )}
      </section>
    </div>
  );
}
