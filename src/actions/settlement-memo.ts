"use server";

import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { saveSettlementMemoContent } from "@/app/settlement/_lib/memo";

export type SaveMemoResult = { ok: true } | { ok: false; message: string };

/** 정산 기타 메모 저장 — 정산 세션 필요. */
export async function saveSettlementMemo(content: unknown): Promise<SaveMemoResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (typeof content !== "string" || content.length > 50_000) {
    return { ok: false, message: "메모 내용이 올바르지 않거나 너무 깁니다(5만자 이내)." };
  }
  try {
    await saveSettlementMemoContent(content);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}
