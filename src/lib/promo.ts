// 자사(협력사) 주간 프로모션 — 2026-07-31 사용자 확정 스펙.
// 매주(수요일 시작, sla 주간과 동일) 초기화. 완료 151건 초과분(152건째부터)
// 1건당 +2,000원 지급. 예: 251건 → (251-151) × 2,000 = 200,000원.
// 기준 건수 = 주간 전체 완료 합계(홈 히어로 "배달 n건"과 동일 산식).
// 클라이언트 안전(순수 계산) — 홈 카드가 사용.

export const PROMO_WEEKLY_THRESHOLD = 151;
export const PROMO_UNIT_KRW = 2_000;

/**
 * 주간 보너스 노출 플래그 — false 면 라이더 화면(홈 카드·프로모션 대시보드·총 적립 합산)에서 숨김.
 * 2026-08-12 종료 → 2026-08-13 재개(사용자 지시, 복구). true = 전 노출.
 */
export const PROMO_WEEKLY_ACTIVE = true;

export interface WeeklyPromo {
  /** 이번 주 완료건 */
  completed: number;
  /** 151건 도달 여부(=151 포함) */
  reached: boolean;
  /** 보너스 발생 여부(152건째부터) */
  earning: boolean;
  /** 구간(151건)까지 남은 건수 — 도달 후 0 */
  remaining: number;
  /** 초과 건수 = 보너스 지급 건수 */
  bonusCount: number;
  /** 보너스 금액(원) */
  bonusKrw: number;
  /** 진행 바(0~100, 151건 기준) */
  progressPct: number;
}

export function weeklyPromo(completed: number): WeeklyPromo {
  const bonusCount = Math.max(0, completed - PROMO_WEEKLY_THRESHOLD);
  return {
    completed,
    reached: completed >= PROMO_WEEKLY_THRESHOLD,
    earning: bonusCount > 0,
    remaining: Math.max(0, PROMO_WEEKLY_THRESHOLD - completed),
    bonusCount,
    bonusKrw: bonusCount * PROMO_UNIT_KRW,
    progressPct: Math.min(100, Math.round((completed / PROMO_WEEKLY_THRESHOLD) * 100)),
  };
}
