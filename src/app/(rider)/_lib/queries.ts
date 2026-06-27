// 대시보드 데이터 접근 — 서버 전용(server component 에서만 호출).
//
// 실연결: backend 헬퍼(getRiderSummary/getRiderHourly, src/lib/supabase/queries.ts)를
//   RLS 사용자 컨텍스트 server client(@/lib/supabase/server)로 호출한다(sla-api.md §4).
// 폴백: Supabase env 미설정(devops 프로비저닝 전) 환경에서는 결정적 목 데이터로 폴백 →
//   QA/디자인 리뷰가 백엔드 없이도 화면을 검증할 수 있게 한다. env 채워지면 자동으로 실데이터.
//
// 단위: acceptance_rate/sla_score 는 0~100 퍼센트(sla-api.md §6) — 목 데이터도 동일.

import type { RiderHourlyRow, RiderSummaryRow, SlaPeriod } from "@/types/database";

// period 유틸의 정식 위치는 _lib/metrics(클라이언트 안전). 기존 import 경로 하위호환 re-export.
export { SLA_PERIODS, isSlaPeriod, parsePeriod } from "./metrics";

/** 대시보드 한 화면 = 현재 기간 요약 + 직전 기간 요약(델타용) + 시간대 분포. */
export interface DashboardData {
  summary: RiderSummaryRow;
  /** 델타(과거의 나) 비교용 직전 기간 요약. 데이터 없으면 null. */
  previous: RiderSummaryRow | null;
  hourly: RiderHourlyRow[];
}

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** 'YYYY-MM-DD' 에서 n일 뺀 날짜 문자열(날짜 전용, TZ 무관). */
function isoDateMinusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(period: SlaPeriod): Promise<DashboardData> {
  if (!hasSupabaseEnv()) {
    return getMockDashboardData(period);
  }

  // 동적 import: env 없는 폴백 환경에서 server-only 모듈을 불러오지 않도록.
  const [{ createClient }, { getRiderSummary, getRiderHourly }] = await Promise.all([
    import("@/lib/supabase/server"),
    import("@/lib/supabase/queries"),
  ]);

  const supabase = await createClient();
  const [summary, hourly] = await Promise.all([
    getRiderSummary(supabase, period),
    getRiderHourly(supabase, period),
  ]);

  // 직전 기간 요약(델타용): 현재 기간 시작일 하루 전을 기준일로 같은 기간 단위 조회.
  let previous: RiderSummaryRow | null = null;
  if (summary?.start_date) {
    const prevRef = isoDateMinusDays(summary.start_date, 1);
    const prev = await getRiderSummary(supabase, period, prevRef);
    previous = prev && prev.active_days > 0 ? prev : null;
  }

  return { summary, previous, hourly };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROVISIONAL mock — Supabase env 미설정 시에만 사용. 실제 데이터 아님.
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_SUMMARY: Record<SlaPeriod, RiderSummaryRow> = {
  today: {
    period: "today", start_date: "2026-06-28", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 92, completed: 18, rejected: 2,
    dispatch_canceled: 1, delivery_canceled: 0, assigned: 21, acceptance_rate: 90,
    active_days: 1, last_captured_at: "2026-06-28T09:00:00Z",
  },
  week: {
    period: "week", start_date: "2026-06-22", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 88, completed: 124, rejected: 11,
    dispatch_canceled: 6, delivery_canceled: 3, assigned: 144, acceptance_rate: 86,
    active_days: 6, last_captured_at: "2026-06-28T09:00:00Z",
  },
  month: {
    period: "month", start_date: "2026-06-01", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 90, completed: 512, rejected: 39,
    dispatch_canceled: 22, delivery_canceled: 9, assigned: 582, acceptance_rate: 88,
    active_days: 26, last_captured_at: "2026-06-28T09:00:00Z",
  },
};

const MOCK_PREVIOUS: Record<SlaPeriod, RiderSummaryRow> = {
  today: { ...MOCK_SUMMARY.today, sla_score: 89, completed: 15, rejected: 3, dispatch_canceled: 2, delivery_canceled: 1, acceptance_rate: 85 },
  week: { ...MOCK_SUMMARY.week, sla_score: 90, completed: 118, rejected: 9, dispatch_canceled: 8, delivery_canceled: 2, acceptance_rate: 88 },
  month: { ...MOCK_SUMMARY.month, sla_score: 87, completed: 488, rejected: 45, dispatch_canceled: 30, delivery_canceled: 12, acceptance_rate: 85 },
};

function mockHourly(period: SlaPeriod): RiderHourlyRow[] {
  const scale = period === "today" ? 1 : period === "week" ? 6 : 26;
  const base = [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 6, 9, 5, 3, 2, 3, 7, 11, 8, 5, 3, 1, 0];
  return base.map((completed, hour) => ({ hour, completed: completed * scale }));
}

async function getMockDashboardData(period: SlaPeriod): Promise<DashboardData> {
  return {
    summary: MOCK_SUMMARY[period],
    previous: MOCK_PREVIOUS[period],
    hourly: mockHourly(period),
  };
}
