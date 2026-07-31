// 배달일지 데이터 접근 — 서버 전용. 세션 라이더의 월별 일일 완료 기록.
// RPC get_rider_daily_for(p_period='month', p_ref=월 중순) 재사용 — 영업일(-6h 앵커) 경계 동일.
// 폴백: DEMO_MODE / env·세션 미설정 → 결정적 목 데이터.

import type { RiderDailyRow } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

export interface DiaryDay {
  /** YYYY-MM-DD (영업일) */
  date: string;
  /** 요일 한 글자 (월~일) */
  weekday: string;
  completed: number;
  rejected: number;
  /** 배차취소 + 배달취소 합 */
  canceled: number;
  /** 0~100 또는 null */
  acceptanceRate: number | null;
}

export interface DiaryMonth {
  /** YYYY-MM */
  month: string;
  days: DiaryDay[]; // 최신일 우선
  totalCompleted: number;
  activeDays: number;
}

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

function weekdayOf(date: string): string {
  // 정오 UTC 앵커 — 서버 TZ 와 무관하게 해당 달력일의 요일을 얻는다.
  return WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

function toDiary(month: string, rows: RiderDailyRow[]): DiaryMonth {
  const days = rows
    .filter((r) => r.completed > 0 || r.rejected > 0 || r.assigned > 0) // 무활동 빈 행 제외
    .map((r) => ({
      date: r.snapshot_date,
      weekday: weekdayOf(r.snapshot_date),
      completed: r.completed,
      rejected: r.rejected,
      canceled: r.dispatch_canceled + r.delivery_canceled,
      acceptanceRate: r.acceptance_rate,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return {
    month,
    days,
    totalCompleted: days.reduce((sum, d) => sum + d.completed, 0),
    activeDays: days.length,
  };
}

// 데모용 결정적 목 — 요청 월의 1~26일 중 주 5~6일 활동.
function demoDiary(month: string): DiaryMonth {
  const rows: RiderDailyRow[] = [];
  for (let d = 1; d <= 26; d++) {
    if (d % 7 === 3) continue; // 주 1일 휴무
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const completed = 24 + ((d * 7) % 23);
    rows.push({
      snapshot_date: date,
      sla_score: null,
      completed,
      rejected: (d * 3) % 5,
      dispatch_canceled: d % 3 === 0 ? 1 : 0,
      delivery_canceled: 0,
      assigned: completed + 5,
      acceptance_rate: 80 + ((d * 11) % 15),
    });
  }
  return toDiary(month, rows);
}

export async function getDeliveryDiary(month: string): Promise<DiaryMonth> {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return demoDiary(month);

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return demoDiary(month);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // sla_period_range('month', ref) = 월초 ~ ref일(month-to-date) — 전체 월을 얻으려면
    // ref 를 그 달의 말일로 준다(미래 일자는 행이 없어 무해, 진행 중인 오늘 행은 포함됨).
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const { data, error } = await admin.rpc("get_rider_daily_for", {
      p_admin_rider_id: session.adminRiderId,
      p_period: "month",
      p_ref: `${month}-${String(lastDay).padStart(2, "0")}`,
    });
    if (error) {
      console.error("[diary] get_rider_daily_for RPC 실패:", error.code, error.message);
      return toDiary(month, []);
    }
    return toDiary(month, data ?? []);
  } catch (e) {
    console.error("[diary] 예기치 못한 예외:", e);
    return toDiary(month, []);
  }
}
