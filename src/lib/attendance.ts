// 출석체크 — 주간(수~화) 일별 완료건 기준. 하루 30건 이상이면 그날 출석 달성.
// 7일 중 5일 달성 시 35,000원 지급. 이 파일 = 출석 규칙 SSOT.

/** 하루 출석 달성 기준(완료건). */
export const ATTENDANCE_DAILY_TARGET = 30;
/** 주간 지급 조건(7일 중 필요한 달성일). */
export const ATTENDANCE_DAYS_REQUIRED = 5;
/** 조건 달성 시 지급액(원). */
export const ATTENDANCE_REWARD = 35_000;
/** 한 주 일수. */
export const ATTENDANCE_WEEK_DAYS = 7;

export interface AttendanceDayInput {
  date: string; // YYYY-MM-DD
  weekday: string; // 수/목/금/토/일/월/화
  completed: number;
}

export interface AttendanceDay extends AttendanceDayInput {
  /** 그날 30건 이상 달성 여부. */
  done: boolean;
}

export interface AttendanceResult {
  days: AttendanceDay[]; // 7일(수~화 순)
  /** 30건 달성한 날 수. */
  achievedDays: number;
  /** 지급 조건 달성일(5). */
  required: number;
  /** 하루 목표(30). */
  dailyTarget: number;
  /** 5일 이상 달성 여부. */
  reached: boolean;
  /** 달성 시 지급액(원), 미달성이면 0. */
  reward: number;
  /** 지급까지 남은 달성일(달성 시 0). */
  remainingDays: number;
}

/** 주간 7일 일별 완료건 → 일별 달성 + 5일 지급 판정. */
export function computeAttendance(days: AttendanceDayInput[]): AttendanceResult {
  const list: AttendanceDay[] = days.map((d) => ({
    ...d,
    done: (d.completed ?? 0) >= ATTENDANCE_DAILY_TARGET,
  }));
  const achievedDays = list.filter((d) => d.done).length;
  const reached = achievedDays >= ATTENDANCE_DAYS_REQUIRED;
  return {
    days: list,
    achievedDays,
    required: ATTENDANCE_DAYS_REQUIRED,
    dailyTarget: ATTENDANCE_DAILY_TARGET,
    reached,
    reward: reached ? ATTENDANCE_REWARD : 0,
    remainingDays: Math.max(0, ATTENDANCE_DAYS_REQUIRED - achievedDays),
  };
}
