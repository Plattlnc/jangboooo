"use server";

import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { savePromoRulesMap, type PromoRules } from "@/app/settlement/_lib/promo-rules";

export type SaveResult = { ok: true } | { ok: false; message: string };

const WED = /^\d{4}-\d{2}-\d{2}$/;

/** 자사 프로모션 주차별 규칙 저장 — 정산 세션 필요. 값은 정제(초과기준·단가 숫자, 0 이상). */
export async function savePromoRules(input: unknown): Promise<SaveResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, message: "잘못된 데이터입니다." };
  }
  const clean: PromoRules = {};
  let count = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!WED.test(k) || !v || typeof v !== "object") continue;
    const t = Math.max(0, Math.floor(Number((v as { threshold?: unknown }).threshold)));
    const u = Math.max(0, Math.floor(Number((v as { unit?: unknown }).unit)));
    const b = (v as { basis?: unknown }).basis === "daily" ? "daily" : "operating";
    if (!Number.isFinite(t) || !Number.isFinite(u)) continue;
    // 초과기준·단가 둘 다 0 이면 규칙 없음으로 간주(저장 제외).
    if (t === 0 && u === 0) continue;
    clean[k] = { threshold: t, unit: u, basis: b };
    if (++count > 1000) break;
  }
  try {
    await savePromoRulesMap(clean);
    return { ok: true };
  } catch {
    return { ok: false, message: "저장 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." };
  }
}
