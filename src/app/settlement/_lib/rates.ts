// 정산 공제 세율 — 서버(daily.ts)·클라이언트(daily-view.tsx) 공용이라 server-only 아님.

/** 원천세율 — 소득세 3% + 지방소득세 0.3% = 3.3%. */
export const WITHHOLDING_RATE = 0.033;
/** 고용·산재보험 요율 — 1.8%. */
export const INSURANCE_RATE = 0.018;

/** 세전 금액에서 원천세·고용산재 공제 → 지급액. 각 공제는 원단위 절사(버림). */
export function applyDeductions(base: number): { wht: number; ins: number; payout: number } {
  const wht = Math.floor(base * WITHHOLDING_RATE);
  const ins = Math.floor(base * INSURANCE_RATE);
  return { wht, ins, payout: base - wht - ins };
}
