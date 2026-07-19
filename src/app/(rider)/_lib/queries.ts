// 대시보드 데이터 접근 — 서버 전용(server component 에서만 호출).
//
// 실연결(#20/#19 계약): 서명 세션쿠키(getRiderSession)의 admin_rider_id 로
//   service_role 기반 *_for RPC(getRiderSummaryFor/getRiderHourlyFor)를 호출한다.
//   라이더 이름은 riders.name(admin 클라이언트) 으로 별도 조회.
// 폴백: DEMO_MODE 또는 Supabase env(service_role) 미설정 시 결정적 목 데이터.
//
// 단위: acceptance_rate/sla_score 는 0~100 퍼센트 — 목 데이터도 동일.

import type { CenterGoalRow, RiderHourlyRow, RiderPeakTotals, RiderSummaryRow, SlaCategoryCounts, SlaPeriod } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

// period 유틸의 정식 위치는 _lib/metrics(클라이언트 안전). 기존 import 경로 하위호환 re-export.
export { SLA_PERIODS, isSlaPeriod, parsePeriod } from "./metrics";

/** 대시보드 한 화면 = 현재 기간 요약 + 직전 기간 요약(델타용) + 시간대 분포 + 라이더 이름 + 공동목표. */
export interface DashboardData {
  summary: RiderSummaryRow;
  /** 델타(과거의 나) 비교용 직전 기간 요약. 데이터 없으면 null. */
  previous: RiderSummaryRow | null;
  hourly: RiderHourlyRow[];
  /** 피크 4버킷 합계 — 배민 원본 버킷값(sla_snapshots.peak_*). 시간 경계 추정 없음. */
  peaks: RiderPeakTotals;
  /** 기간 B마트 세부 합계(breakdown.bmart). 미보유(과거 데이터)면 null → 분리 표시 생략. */
  bmart: SlaCategoryCounts | null;
  /** 세션 라이더 이름(헤더 표시). 미상이면 null. */
  riderName: string | null;
  /** 센터 공동목표 4피크(ml→pl→d→pd). best-effort — 미수집/실패 시 빈 배열. */
  centerGoals: CenterGoalRow[];
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

  const { getRiderSummaryFor, getRiderHourlyFor, getRiderPeaksFor, getRiderBmartFor } = await import("@/lib/supabase/queries");
  const [summary, hourly, centerGoals] = await Promise.all([
    getRiderSummaryFor(adminRiderId, period),
    getRiderHourlyFor(adminRiderId, period),
    getCenterGoals(adminRiderId),
  ]);

  // 직전 기간 요약(델타용)·피크 4버킷·B마트 세부: 모두 summary 의 기간 경계에 의존 → 병렬 후속 조회.
  let previous: RiderSummaryRow | null = null;
  let peaks: RiderPeakTotals = { morning: 0, afternoon: 0, evening: 0, midnight: 0 };
  let bmart: SlaCategoryCounts | null = null;
  if (summary?.start_date) {
    const [prev, peakTotals, bmartTotals] = await Promise.all([
      getRiderSummaryFor(adminRiderId, period, isoDateMinusDays(summary.start_date, 1)),
      getRiderPeaksFor(adminRiderId, summary.start_date, summary.end_date),
      getRiderBmartFor(adminRiderId, summary.start_date, summary.end_date),
    ]);
    previous = prev && prev.active_days > 0 ? prev : null;
    peaks = peakTotals;
    bmart = bmartTotals;
  }

  return { summary, previous, hourly, peaks, bmart, riderName: await getRiderName(adminRiderId), centerGoals };
}

/**
 * 센터 공동목표(4피크) 조회 — get_center_goals_for RPC(service_role, admin 클라이언트).
 * 계약: docs/api/center-goals.md. 항상 4행(ml→pl→d→pd). pct 는 소스값(100 상한) 그대로.
 * best-effort: 스크래퍼 라이브 미검증 + 센터 미매핑 가능성 → 실패/미수집은 빈 배열로 흡수
 *   (대시보드 핵심 지표에 영향 주지 않게). GoalCard 가 빈 배열 → 빈 상태 표시.
 */
async function getCenterGoals(adminRiderId: string): Promise<CenterGoalRow[]> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_center_goals_for", {
      p_admin_rider_id: adminRiderId,
    });
    if (error) {
      // 조용히 [] 로 흡수하지 말 것 — 원인(마이그레이션 미적용 42883 / 권한 / 매핑)을 로그로 노출.
      console.error(
        "[center-goals] get_center_goals_for RPC 실패:",
        error.code,
        error.message,
        error.details ?? "",
      );
      return [];
    }
    // 데이터는 4행을 반환하나 전부 null 이면 미수집(스크래퍼/센터 매핑) 신호 — 가시화.
    const filled = (data ?? []).filter((g) => g.pct != null).length;
    if (filled === 0) {
      console.warn(
        `[center-goals] rider=${adminRiderId}: RPC 4행 반환했으나 유효값 0 — center_peak_goals 미적재 또는 center_id 미매핑 의심`,
      );
    }
    return data ?? [];
  } catch (e) {
    console.error("[center-goals] 예기치 못한 예외:", e);
    return [];
  }
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
    period: "week", start_date: "2026-06-24", end_date: "2026-06-30",
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

// B마트 세부 목 — 요약 합계(completed 등)에 포함된 것으로 가정(합계 − bmart = 일반).
const MOCK_BMART: Record<SlaPeriod, SlaCategoryCounts> = {
  today: { complete: 2, reject: 1, cancel: 0, riderFault: 0 },
  week: { complete: 9, reject: 3, cancel: 1, riderFault: 0 },
  month: { complete: 34, reject: 11, cancel: 4, riderFault: 1 },
};

function mockHourly(period: SlaPeriod): RiderHourlyRow[] {
  const scale = period === "today" ? 1 : period === "week" ? 6 : 26;
  const base = [0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 3, 6, 9, 5, 3, 2, 3, 7, 11, 8, 5, 3, 1, 0];
  return base.map((completed, hour) => ({ hour, completed: completed * scale }));
}

// 실데이터에선 배민 원본 버킷(sla_snapshots.peak_*) 합산 — 목은 mockHourly 와 비슷한 분포로 고정.
function mockPeaks(period: SlaPeriod): RiderPeakTotals {
  const scale = period === "today" ? 1 : period === "week" ? 6 : 26;
  return { morning: 23 * scale, afternoon: 13 * scale, evening: 34 * scale, midnight: 1 * scale };
}

// 공동목표 목 — 4피크 상태 다양화(부분/달성/0/미수집)로 모든 표시 케이스 검증.
const MOCK_CENTER_GOALS: CenterGoalRow[] = [
  { peak_key: "ml", peak_order: 0, label: "아침점심", current: 168, goal: 336, pct: 50, snapshot_date: "2026-06-28", center_id: "MOCK-CENTER" },
  { peak_key: "pl", peak_order: 1, label: "오후논피크", current: 336, goal: 336, pct: 100, snapshot_date: "2026-06-28", center_id: "MOCK-CENTER" },
  { peak_key: "d", peak_order: 2, label: "저녁피크", current: 0, goal: 560, pct: 0, snapshot_date: "2026-06-28", center_id: "MOCK-CENTER" },
  { peak_key: "pd", peak_order: 3, label: "심야논피크", current: null, goal: null, pct: null, snapshot_date: "2026-06-28", center_id: "MOCK-CENTER" },
];

async function getMockDashboardData(period: SlaPeriod): Promise<DashboardData> {
  return {
    summary: MOCK_SUMMARY[period],
    previous: MOCK_PREVIOUS[period],
    hourly: mockHourly(period),
    peaks: mockPeaks(period),
    bmart: MOCK_BMART[period],
    riderName: "라이더",
    centerGoals: MOCK_CENTER_GOALS,
  };
}
