import type { RiderSummaryRow, SlaPeriod } from "@/types/database";
import { StatCard } from "./stat-card";
import { acceptanceStatus, PERIOD_SUBJECT_LOCATIVE } from "@/app/(rider)/_lib/metrics";

// 03 §E. 지표 5종 그리드. 델타는 직전 기간 대비. 카피 SSOT: docs/copy/dashboard.md §3.
interface StatGridProps {
  summary: RiderSummaryRow;
  previous: RiderSummaryRow | null;
  period: SlaPeriod;
}

function diff(cur: number, prev: number | undefined): number | null {
  return prev == null ? null : cur - prev;
}

function acceptanceNote(rate: number | null, period: SlaPeriod): string | undefined {
  if (rate == null) return undefined;
  // rate 는 0~100 퍼센트 (sla-api.md §6).
  const pct = Math.round(rate);
  if (pct >= 90) return `수락률 ${pct}%, 콜을 잘 잡고 있어요`;
  if (pct >= 70) return `수락률 ${pct}%`;
  // QA-002: 라벨 중복/조사 보정된 처소격 주어 사용("이번 주엔" 등).
  return `수락률 ${pct}%, ${PERIOD_SUBJECT_LOCATIVE[period]} 조금 낮아요`;
}

export function StatGrid({ summary, previous, period }: StatGridProps) {
  const p = previous ?? undefined;
  const acceptancePct = summary.acceptance_rate == null ? null : Math.round(summary.acceptance_rate);

  return (
    <section aria-label="SLA 지표" className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <StatCard
        label="완료"
        emoji="✅"
        tooltip="정상적으로 끝낸 배달 건수예요."
        value={summary.completed}
        unit="건"
        delta={diff(summary.completed, p?.completed)}
        good="up"
      />
      <StatCard
        label="거절"
        emoji="🙅"
        tooltip="들어온 콜을 받지 않은 건수예요."
        value={summary.rejected}
        unit="건"
        delta={diff(summary.rejected, p?.rejected)}
        good="down"
      />
      <StatCard
        label="배차취소"
        emoji="🔄"
        tooltip="배차를 받은 뒤 픽업 전에 취소된 건수예요."
        value={summary.dispatch_canceled}
        unit="건"
        delta={diff(summary.dispatch_canceled, p?.dispatch_canceled)}
        good="down"
      />
      <StatCard
        label="배달취소"
        emoji="📦"
        tooltip="픽업 이후 배달이 취소된 건수예요."
        value={summary.delivery_canceled}
        unit="건"
        delta={diff(summary.delivery_canceled, p?.delivery_canceled)}
        good="down"
      />
      <StatCard
        className="col-span-2 md:col-span-1"
        label="수락률"
        emoji="🤝"
        tooltip="들어온 콜 중 내가 받은 비율이에요. (받은 콜 ÷ 전체 콜)"
        value={acceptancePct}
        unit="%"
        valueStatus={summary.acceptance_rate == null ? undefined : acceptanceStatus(summary.acceptance_rate)}
        note={acceptanceNote(summary.acceptance_rate, period)}
      />
    </section>
  );
}
