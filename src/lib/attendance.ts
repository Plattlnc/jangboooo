// 출석체크 — 주간(수~화) 완료건 기반. 30건당 출석 1회(최대 5회), 5회 달성 시 35,000원.
// 라이더 키·주간 경계는 배달등급과 동일(get_rider_summary_for('week')). 이 파일 = 출석 규칙 SSOT.

/** 출석 1회당 필요한 완료건. */
export const ATTENDANCE_PER_STAMP = 30;
/** 주간 목표 출석 횟수. */
export const ATTENDANCE_TARGET = 5;
/** 목표(5회=150건) 달성 시 지급액(원). */
export const ATTENDANCE_REWARD = 35_000;

export interface AttendanceResult {
  completed: number;
  /** 획득 출석 횟수(0~5). */
  stamps: number;
  /** 목표 출석 횟수(5). */
  target: number;
  /** 5회 달성 여부. */
  reached: boolean;
  /** 달성 시 지급액(원), 미달성이면 0. */
  reward: number;
  /** 다음 출석 1회까지 남은 완료건(달성 시 0). */
  toNextStamp: number;
  /** 5회(=150건)까지 남은 완료건(달성 시 0). */
  toReward: number;
}

/** 주간 완료건 → 출석 횟수·보상. 30건당 1회(최대 5), 5회 달성 시 35,000원. */
export function computeAttendance(completed: number): AttendanceResult {
  const c = Math.max(0, Math.floor(completed || 0));
  const rawStamps = Math.floor(c / ATTENDANCE_PER_STAMP);
  const stamps = Math.min(ATTENDANCE_TARGET, rawStamps);
  const reached = stamps >= ATTENDANCE_TARGET;
  const goal = ATTENDANCE_TARGET * ATTENDANCE_PER_STAMP; // 150
  return {
    completed: c,
    stamps,
    target: ATTENDANCE_TARGET,
    reached,
    reward: reached ? ATTENDANCE_REWARD : 0,
    toNextStamp: reached ? 0 : Math.max(0, (rawStamps + 1) * ATTENDANCE_PER_STAMP - c),
    toReward: reached ? 0 : Math.max(0, goal - c),
  };
}
