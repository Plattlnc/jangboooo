// 대시보드 (03-screen-dashboard). 데이터는 _lib/queries 목 스텁.
// PROVISIONAL: backend fetch 레이어 도착 시 getDashboardData 만 교체.

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PeriodTabs } from "@/components/dashboard/period-tabs";
import { SlaScore } from "@/components/dashboard/sla-score";
import { MotivationBanner } from "@/components/dashboard/motivation-banner";
import { StatGrid } from "@/components/dashboard/stat-grid";
import { PeakHourChart } from "@/components/dashboard/peak-hour-chart";
import { FooterActions } from "@/components/dashboard/footer-actions";
import { getDashboardData } from "@/app/(rider)/_lib/queries";
import { parsePeriod, PERIOD_LABEL, selectMotivation } from "@/app/(rider)/_lib/metrics";

interface DashboardPageProps {
  // Next 16: searchParams 는 비동기.
  searchParams: Promise<{ period?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { period: rawPeriod } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const { summary, previous, hourly } = await getDashboardData(period);

  const motivation = selectMotivation(
    summary.sla_score,
    previous?.sla_score ?? null,
    period,
  );

  return (
    <div className="flex flex-col gap-5 pt-4">
      {/* PROVISIONAL: 라이더명은 backend 라이더 프로필 도착 후 연결. 현재 기본값. */}
      <DashboardHeader name="라이더" lastCapturedAt={summary.last_captured_at} />
      <PeriodTabs active={period} />
      <SlaScore score={summary.sla_score} periodLabel={PERIOD_LABEL[period]} />
      {motivation ? (
        <MotivationBanner tone={motivation.tone} message={motivation.message} />
      ) : null}
      <StatGrid summary={summary} previous={previous} period={period} />
      <PeakHourChart data={hourly} />
      <FooterActions />
    </div>
  );
}
