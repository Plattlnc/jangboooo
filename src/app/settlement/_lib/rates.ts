// 정산 공제 세율/수수료 — 서버(daily.ts)·클라이언트(daily-view.tsx) 공용이라 server-only 아님.

/** 원천세율 — 소득세 3% + 지방소득세 0.3% = 3.3%. */
export const WITHHOLDING_RATE = 0.033;
/** 고용·산재보험 요율 — 1.8%. */
export const INSURANCE_RATE = 0.018;
/** 카테고리별 수수료 — 배달처리비·미션비 각각 정액 차감(세전>0 일 때만). */
export const CATEGORY_FEE = 100;

/**
 * 세전 금액에서 원천세·고용산재(원단위 절사) + 수수료(정액) 공제 → 지급액.
 * 세전이 0 이하면 공제·수수료 없이 전부 0(미션 없는 날 -100 방지).
 */
export function applyDeductions(base: number): { wht: number; ins: number; fee: number; payout: number } {
  if (base <= 0) return { wht: 0, ins: 0, fee: 0, payout: 0 };
  const wht = Math.floor(base * WITHHOLDING_RATE);
  const ins = Math.floor(base * INSURANCE_RATE);
  const fee = CATEGORY_FEE;
  return { wht, ins, fee, payout: base - wht - ins - fee };
}
