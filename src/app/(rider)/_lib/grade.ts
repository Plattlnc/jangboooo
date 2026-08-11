// 배달등급 데이터 — 세션 라이더의 이번 주(수~화) 누적 완료건 → 현재 등급 + 누진 보상.
// 완료건 = get_rider_summary_for('week').completed(전체 완료, 히어로 배달건과 동일 기준).
// 라이더 키 = admin_rider_id(=User ID). 폴백: 데모/미설정/세션없음.

import { computeGrade, GRADE_SEASON_START, type GradeResult, type Tier } from "@/lib/grade";
import { computeAttendance, type AttendanceResult } from "@/lib/attendance";
import { DEMO_MODE } from "@/lib/demo";
import { getRiderProfile } from "./rider-profile";

export interface MyGrade extends GradeResult {
  name: string;
  weekStart: string | null; // 이번 주 시작(수)
  weekEnd: string | null; // 이번 주 끝(화)
}

function wrap(name: string, completed: number, weekStart: string | null, weekEnd: string | null): MyGrade {
  return { name, weekStart, weekEnd, ...computeGrade(completed) };
}

export async function getMyGrade(): Promise<MyGrade> {
  const profile = await getRiderProfile(); // 이름(데모 안전)
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return wrap(profile.name, 223, null, null); // 데모: 다이아 예시

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return wrap(profile.name, 0, null, null);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_rider_summary_for", {
      p_admin_rider_id: session.adminRiderId,
      p_period: "week",
    });
    if (error) {
      console.error("[grade] get_rider_summary_for 실패:", error.code, error.message);
      return wrap(profile.name, 0, null, null);
    }
    const row = data?.[0];
    return wrap(profile.name, row?.completed ?? 0, row?.start_date ?? null, row?.end_date ?? null);
  } catch (e) {
    console.error("[grade] 예외:", e);
    return wrap(profile.name, 0, null, null);
  }
}

// ── 내 등급 기록(주차별) — 시즌 시작 이후 완료된 주(수~화)만. 진행 중인 이번 주는 제외. ──
export interface GradeWeek {
  weekStart: string; // YYYY-MM-DD (수)
  weekEnd: string; // YYYY-MM-DD (화)
  completed: number;
  tier: Tier;
  reward: number;
}

/** 현재 KST 달력일 YYYY-MM-DD. */
function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}
/** 날짜가 속한 주(수요일 시작)의 수요일. */
function weekStartWed(dateStr: string): Date {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const back = (d.getUTCDay() - 3 + 7) % 7; // 수=3 기준 되돌림
  d.setUTCDate(d.getUTCDate() - back);
  return d;
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

export async function getMyGradeHistory(): Promise<GradeWeek[]> {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return []; // 시행 전 — 기록 없음

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return [];

  const today = kstToday();
  const curStart = weekStartWed(today); // 진행 중인 이번 주 시작(수)
  const season = new Date(`${GRADE_SEASON_START}T00:00:00Z`);
  // 완료된 시즌 주가 없으면(이번 주 시작 ≤ 시즌 시작) 빈 기록.
  if (curStart.getTime() <= season.getTime()) return [];

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const rangeEnd = addDays(curStart, -1); // 이번 주 전날 = 마지막 완료 주의 화요일
    const { data, error } = await admin
      .from("sla_snapshots")
      .select("snapshot_date, completed")
      .eq("admin_rider_id", session.adminRiderId)
      .gte("snapshot_date", GRADE_SEASON_START)
      .lte("snapshot_date", ymd(rangeEnd));
    if (error) {
      console.error("[grade] 기록 조회 실패:", error.code, error.message);
      return [];
    }
    // 주(수~화)별 완료건 합산.
    const byWeek = new Map<string, number>();
    for (const r of data ?? []) {
      const ws = ymd(weekStartWed(r.snapshot_date as string));
      byWeek.set(ws, (byWeek.get(ws) ?? 0) + ((r.completed as number) ?? 0));
    }
    const weeks: GradeWeek[] = [];
    for (const [ws, completed] of byWeek) {
      const g = computeGrade(completed);
      weeks.push({ weekStart: ws, weekEnd: ymd(addDays(new Date(`${ws}T00:00:00Z`), 6)), completed, tier: g.tier, reward: g.reward });
    }
    return weeks.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)); // 최신 주 우선
  } catch (e) {
    console.error("[grade] 기록 예외:", e);
    return [];
  }
}

// ── 출석체크(주간 수~화 일별 30건, 7일 중 5일 달성 시 35,000원) ──
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;
function weekdayKo(dateStr: string): string {
  return WEEKDAY_KO[new Date(`${dateStr}T12:00:00Z`).getUTCDay()]!;
}

export interface MyAttendance extends AttendanceResult {
  weekStart: string; // 수
  weekEnd: string; // 화
  today: string; // 오늘(KST) — 진행 중 날짜 강조용
}

export async function getMyAttendance(): Promise<MyAttendance> {
  const today = kstToday();
  const ws = weekStartWed(today);
  const weekStart = ymd(ws);
  const weekEnd = ymd(addDays(ws, 6));
  const dayDates = Array.from({ length: 7 }, (_, i) => ymd(addDays(ws, i)));
  const build = (byDate: Map<string, number>): MyAttendance => ({
    weekStart,
    weekEnd,
    today,
    ...computeAttendance(
      dayDates.map((date) => ({ date, weekday: weekdayKo(date), completed: byDate.get(date) ?? 0 })),
      today,
    ),
  });

  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) {
    // 데모: 5일 달성(30+), 1일 미달(12), 1일 0 → 지급 조건 충족 예시
    const demo = new Map<string, number>();
    dayDates.forEach((d, i) => demo.set(d, i < 5 ? 30 + i * 5 : i === 5 ? 12 : 0));
    return build(demo);
  }

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return build(new Map());

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_rider_daily_for", {
      p_admin_rider_id: session.adminRiderId,
      p_period: "week",
    });
    if (error) {
      console.error("[attendance] get_rider_daily_for 실패:", error.code, error.message);
      return build(new Map());
    }
    const byDate = new Map<string, number>();
    for (const r of data ?? []) byDate.set(r.snapshot_date as string, (r.completed as number) ?? 0);
    return build(byDate);
  } catch (e) {
    console.error("[attendance] 예외:", e);
    return build(new Map());
  }
}
