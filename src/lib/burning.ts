// 버닝 이벤트(기간 한정 자사 프로모션) — 라이더 등급 플래티넘 이상이면 주간 배달료(미션 제외)의 5%
// 를 추가 정산. 주간(수~화) 기준, 매주 반영. 배달료 데이터는 익일 적재라 당일분은 제외(N일치).
// 이 파일 = 버닝 이벤트 규칙 SSOT.

import { computeGrade, TIERS } from "./grade";

/** 추가 정산 비율(5%). */
export const BURNING_RATE = 0.05;
/** 자격 최소 등급(이 등급 이상). */
export const BURNING_MIN_TIER_KEY = "platinum";
/** 기간 한정 이벤트 시작일(수). 종료는 미정(별도 공지). */
export const BURNING_START_DATE = "2026-08-12";

const MIN_TIER_INDEX = TIERS.findIndex((t) => t.key === BURNING_MIN_TIER_KEY);
/** 자격 최소 등급명(예: '플래티넘'). */
export const BURNING_MIN_TIER_NAME = TIERS[MIN_TIER_INDEX]?.name ?? "플래티넘";
/** 자격 최소 완료건(플래티넘 하한). */
export const BURNING_MIN_COMPLETED = TIERS[MIN_TIER_INDEX]?.min ?? 151;

/** 주간 완료건 → 플래티넘 이상(자격) 여부. */
export function isBurningEligible(completed: number): boolean {
  const tier = computeGrade(completed).tier;
  return TIERS.indexOf(tier) >= MIN_TIER_INDEX;
}

/** 주간 배달료(미션 제외) → 자격 시 5% 보너스(원), 아니면 0. */
export function computeBurningBonus(completed: number, feeKrw: number): number {
  return isBurningEligible(completed) ? Math.round(feeKrw * BURNING_RATE) : 0;
}

export interface BurningWeek {
  weekStart: string; // 수 YYYY-MM-DD
  weekEnd: string; // 화 YYYY-MM-DD
  completed: number; // 주간 완료건
  tierName: string; // 그 주 등급명
  eligible: boolean; // 플래티넘 이상
  /** 주간 배달료 합(원, 미션 제외) — 데이터 반영된 날만 */
  feeKrw: number;
  /** 배달료 데이터가 반영된 일수(당일분 지연 제외) */
  daysWithData: number;
  /** 5% 보너스(원). 미자격이면 0 */
  bonusKrw: number;
  /** 진행 중(현재 주) 여부 — true 면 부분 집계(예상) */
  inProgress: boolean;
}
