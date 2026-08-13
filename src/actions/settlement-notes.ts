"use server";

import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { saveRiderNotesMap, saveRiderMemosMap } from "@/app/settlement/_lib/notes";

export type SaveNotesResult = { ok: true } | { ok: false; message: string };

/** {riderId: string} 맵 정제 — 빈 값 제외, 2000자 상한, 최대 5000행. 유효 객체 아니면 null. */
function sanitizeMap(input: unknown): Record<string, string> | null {
  if (input == null || typeof input !== "object" || Array.isArray(input)) return null;
  const clean: Record<string, string> = {};
  let count = 0;
  for (const [id, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) {
      clean[id] = v.slice(0, 2000);
      if (++count > 5000) break;
    }
  }
  return clean;
}

/** 라이더별 특이사항 저장 — 정산 세션 필요. 빈 값은 제외해 저장. */
export async function saveRiderNotes(notes: unknown): Promise<SaveNotesResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  const clean = sanitizeMap(notes);
  if (!clean) return { ok: false, message: "잘못된 데이터입니다." };
  try {
    await saveRiderNotesMap(clean);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}

/** 라이더별 메모 저장 — 정산 세션 필요. 빈 값은 제외해 저장. */
export async function saveRiderMemos(memos: unknown): Promise<SaveNotesResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  const clean = sanitizeMap(memos);
  if (!clean) return { ok: false, message: "잘못된 데이터입니다." };
  try {
    await saveRiderMemosMap(clean);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}
