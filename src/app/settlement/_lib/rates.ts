// 정산 공제 세율/수수료 — 서버(daily.ts)·클라이언트(daily-view.tsx) 공용이라 server-only 아님.

/** 원천세율 — 소득세 3% + 지방소득세 0.3% = 3.3%. */
export const WITHHOLDING_RATE = 0.033;
/** 고용·산재보험 요율 — 1.8%. */
export const INSURANCE_RATE = 0.018;
/** 배달처리비 완료건당 수수료(원). 배달처리비에만 적용(완료건수×이 값). 미션비는 미적용. */
export const PER_COMPLETED_FEE = 100;

/**
 * 세전 금액에서 원천세·고용산재(원단위 절사) + 수수료(정액, 인자로 전달) 공제 → 지급액.
 * 세전이 0 이하면 전부 0. fee 는 호출부에서 계산(배달처리비=완료건수×PER_COMPLETED_FEE, 미션비=0).
 */
export function applyDeductions(base: number, fee = 0): { wht: number; ins: number; fee: number; payout: number } {
  if (base <= 0) return { wht: 0, ins: 0, fee: 0, payout: 0 };
  const wht = Math.floor(base * WITHHOLDING_RATE);
  const ins = Math.floor(base * INSURANCE_RATE);
  return { wht, ins, fee, payout: base - wht - ins - fee };
}
