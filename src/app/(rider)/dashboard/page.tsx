// 대시보드 (06-dashboard-redesign / Figma "Project newcar"). 데이터는 _lib/queries.
// 메인 지표 = 수락률 원형 게이지(SLA 점수 폐기). backend 헤드라인 = acceptance_rate.

import { GreetingBlock } from "@/components/dashboard/greeting-block";
import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { AcceptanceGauge } from "@/components/dashboard/acceptance-gauge";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PeakCard } from "@/components/dashboard/peak-card";
import { RefreshButton } from "@/components/dashboard/refresh-button";
import { Badge } from "@/components/ui/badge";
import { getDashboardData } from "@/app/(rider)/_lib/queries";
import {
  parsePeriod,
  GAUGE_LABEL,
  gaugeNote,
  aggregatePeakBuckets,
  formatDashboardDate,
  formatUpdatedAt,
  liveStatus,
} from "@/app/(rider)/_lib/metrics";
import { DEMO_MODE } from "@/lib/demo";

interface DashboardPageProps {
  // Next 16: searchParams 는 비동기.
  searchParams: Promise<{ period?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const { summary, hourly, riderName } = await getDashboardData(period);

  const dateText = formatDashboardDate(new Date());
  const live = liveStatus(formatUpdatedAt(summary.last_captured_at).stale);
  const canceled = summary.dispatch_canceled + summary.delivery_canceled;
  const buckets = aggregatePeakBuckets(hourly);

  return (
    <div className="flex flex-col gap-5">
      <GreetingBlock name={riderName ?? "라이더"} dateText={dateText} live={live} />
      <PeriodTabs active={period} />

      {DEMO_MODE ? (
        <div className="flex justify-center">
          <Badge variant="info">데모 모드 · 예시 데이터</Badge>
        </div>
      ) : null}

      <AcceptanceGauge
        rate={summary.acceptance_rate}
        label={GAUGE_LABEL[period]}
        note={gaugeNote(summary.acceptance_rate, period)}
      />
      <StatCards completed={summary.completed} rejected={summary.rejected} canceled={canceled} />
      <PeakCard buckets={buckets} />
      <RefreshButton />
    </div>
  );
}
