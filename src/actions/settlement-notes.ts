"use server";

import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { saveRiderNotesMap } from "@/app/settlement/_lib/notes";

export type SaveNotesResult = { ok: true } | { ok: false; message: string };

/** 라이더별 특이사항 저장 — 정산 세션 필요. 빈 값은 제외해 저장. */
export async function saveRiderNotes(notes: unknown): Promise<SaveNotesResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (notes == null || typeof notes !== "object" || Array.isArray(notes)) {
    return { ok: false, message: "잘못된 데이터입니다." };
  }
  const clean: Record<string, string> = {};
  let count = 0;
  for (const [id, v] of Object.entries(notes as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) {
      clean[id] = v.slice(0, 2000);
      if (++count > 5000) break;
    }
  }
  try {
    await saveRiderNotesMap(clean);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}
