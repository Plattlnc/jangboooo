// 대시보드 데이터 접근 — 서버 전용(server component 에서만 호출).
//
// 실연결(#20/#19 계약): 서명 세션쿠키(getRiderSession)의 admin_rider_id 로
//   service_role 기반 *_for RPC(getRiderSummaryFor/getRiderHourlyFor)를 호출한다.
//   라이더 이름은 riders.name(admin 클라이언트) 으로 별도 조회.
// 폴백: DEMO_MODE 또는 Supabase env(service_role) 미설정 시 결정적 목 데이터.
//
// 단위: acceptance_rate/sla_score 는 0~100 퍼센트 — 목 데이터도 동일.

import type { RiderHourlyRow, RiderSummaryRow, SlaPeriod } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

// period 유틸의 정식 위치는 _lib/metrics(클라이언트 안전). 기존 import 경로 하위호환 re-export.
export { SLA_PERIODS, isSlaPeriod, parsePeriod } from "./metrics";

/** 대시보드 한 화면 = 현재 기간 요약 + 직전 기간 요약(델타용) + 시간대 분포 + 라이더 이름. */
export interface DashboardData {
  summary: RiderSummaryRow;
  /** 델타(과거의 나) 비교용 직전 기간 요약. 데이터 없으면 null. */
  previous: RiderSummaryRow | null;
  hourly: RiderHourlyRow[];
  /** 세션 라이더 이름(헤더 표시). 미상이면 null. */
  riderName: string | null;
}

// 실데이터 경로는 service_role 필요(*_for RPC + riders 조회). 없으면 목 폴백.
function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** 'YYYY-MM-DD' 에서 n일 뺀 날짜 문자열(날짜 전용, TZ 무관). */
function isoDateMinusDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(period: SlaPeriod): Promise<DashboardData> {
  // 데모 모드(#13) 또는 Supabase service_role 미설정 → 목 데이터.
  if (DEMO_MODE || !hasSupabaseEnv()) {
    return getMockDashboardData(period);
  }

  // 동적 import: 목 폴백 경로에서 server-only 모듈을 불러오지 않도록.
  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) {
    // middleware 가 미인증 /dashboard 를 막지만 방어적으로 로그인 유도.
    const { redirect } = await import("next/navigation");
    return redirect("/login");
  }
  const adminRiderId = session.adminRiderId;

  const { getRiderSummaryFor, getRiderHourlyFor } = await import("@/lib/supabase/queries");
  const [summary, hourly] = await Promise.all([
    getRiderSummaryFor(adminRiderId, period),
    getRiderHourlyFor(adminRiderId, period),
  ]);

  // 직전 기간 요약(델타용): 현재 기간 시작일 하루 전을 기준일로 같은 기간 단위 조회.
  let previous: RiderSummaryRow | null = null;
  if (summary?.start_date) {
    const prev = await getRiderSummaryFor(adminRiderId, period, isoDateMinusDays(summary.start_date, 1));
    previous = prev && prev.active_days > 0 ? prev : null;
  }

  return { summary, previous, hourly, riderName: await getRiderName(adminRiderId) };
}

/**
 * 세션 라이더 이름 조회 (riders.name, admin 클라이언트).
 * NOTE: getRiderSession/summary 가 name 을 안 실어줘서 별도 조회 — backend 가 세션/요약에
 *       name 을 포함시키면 그걸로 교체 가능(요청해둠).
 */
async function getRiderName(adminRiderId: string): Promise<string | null> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("riders")
      .select("name")
      .eq("admin_rider_id", adminRiderId)
      .maybeSingle();
    return data?.name ?? null;
  } catch {
    return null;
  }
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
    riderName: "라이더",
  };
}
