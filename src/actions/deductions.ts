"use server";

import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { saveRiderDeductionsMap } from "@/app/settlement/_lib/deductions";

export type SaveResult = { ok: true } | { ok: false; message: string };

/** 라이더별 시간제보험료 차감액 저장 — 정산 세션 필요. 0 이하/비숫자는 제외. */
export async function saveRiderDeductions(input: unknown): Promise<SaveResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "잘못된 데이터입니다." };
  }
  const clean: Record<string, number> = {};
  let count = 0;
  for (const [id, v] of Object.entries(input as Record<string, unknown>)) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n > 0) clean[id] = n;
    if (++count > 5000) break;
  }
  try {
    await saveRiderDeductionsMap(clean);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}
