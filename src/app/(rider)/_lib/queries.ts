// PROVISIONAL: 실제 데이터 페칭(backend RPC 호출) 도착 후 교체.
//
// 타입은 backend 실스키마(src/types/database.ts)를 사용한다.
// 데이터는 아직 결정적 목 — get_rider_summary / get_rider_hourly RPC 응답 형태에 맞춤.
// backend 가 fetch 레이어(server action vs route handler) 확정 시 getDashboardData 만 교체.

import type { RiderHourlyRow, RiderSummaryRow, SlaPeriod } from "@/types/database";

export const SLA_PERIODS: readonly SlaPeriod[] = ["today", "week", "month"];

export function isSlaPeriod(value: unknown): value is SlaPeriod {
  return typeof value === "string" && (SLA_PERIODS as readonly string[]).includes(value);
}

/** searchParams 의 period 값을 안전하게 SlaPeriod 로 정규화 (기본 today). */
export function parsePeriod(raw: string | string[] | undefined): SlaPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isSlaPeriod(value) ? value : "today";
}

/**
 * 대시보드 한 화면 = 현재 기간 요약(get_rider_summary) + 직전 기간 요약(델타용)
 * + 시간대 분포(get_rider_hourly).
 */
export interface DashboardData {
  summary: RiderSummaryRow;
  /** 델타(과거의 나) 비교용 직전 기간 요약. 없으면 null. */
  previous: RiderSummaryRow | null;
  hourly: RiderHourlyRow[];
}

// PROVISIONAL mock — 결정적 더미. 실제 데이터 아님.
const MOCK_SUMMARY: Record<SlaPeriod, RiderSummaryRow> = {
  today: {
    period: "today", start_date: "2026-06-28", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 92, completed: 18, rejected: 2,
    dispatch_canceled: 1, delivery_canceled: 0, assigned: 21, acceptance_rate: 0.9,
    active_days: 1, last_captured_at: "2026-06-28T09:00:00Z",
  },
  week: {
    period: "week", start_date: "2026-06-22", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 88, completed: 124, rejected: 11,
    dispatch_canceled: 6, delivery_canceled: 3, assigned: 144, acceptance_rate: 0.86,
    active_days: 6, last_captured_at: "2026-06-28T09:00:00Z",
  },
  month: {
    period: "month", start_date: "2026-06-01", end_date: "2026-06-28",
    admin_rider_id: "MOCK-0000", sla_score: 90, completed: 512, rejected: 39,
    dispatch_canceled: 22, delivery_canceled: 9, assigned: 582, acceptance_rate: 0.88,
    active_days: 26, last_captured_at: "2026-06-28T09:00:00Z",
  },
};

// 직전 기간(델타 방향 시연용 — 일부는 호조, 일부는 부진).
const MOCK_PREVIOUS: Record<SlaPeriod, RiderSummaryRow> = {
  today: { ...MOCK_SUMMARY.today, sla_score: 89, completed: 15, rejected: 3, dispatch_canceled: 2, delivery_canceled: 1, acceptance_rate: 0.85 },
  week: { ...MOCK_SUMMARY.week, sla_score: 90, completed: 118, rejected: 9, dispatch_canceled: 8, delivery_canceled: 2, acceptance_rate: 0.88 },
  month: { ...MOCK_SUMMARY.month, sla_score: 87, completed: 488, rejected: 45, dispatch_canceled: 30, delivery_canceled: 12, acceptance_rate: 0.85 },
};

function mockHourly(period: SlaPeriod): RiderHourlyRow[] {
  const scale = period === "today" ? 1 : period === "week" ? 6 : 26;
  // 점심/저녁 피크를 흉내낸 결정적 분포.
  const base = [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 6, 9, 5, 3, 2, 3, 7, 11, 8, 5, 3, 1, 0];
  return base.map((completed, hour) => ({ hour, completed: completed * scale }));
}

/**
 * PROVISIONAL: backend RPC(get_rider_summary / get_rider_hourly) 호출로 교체.
 * 현재는 목 데이터만 반환한다 (DB/네트워크 접근 없음).
 */
export async function getDashboardData(period: SlaPeriod): Promise<DashboardData> {
  return {
    summary: MOCK_SUMMARY[period],
    previous: MOCK_PREVIOUS[period],
    hourly: mockHourly(period),
  };
}
