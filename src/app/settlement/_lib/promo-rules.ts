import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 자사 프로모션 주차별 규칙 — 주(수~화)마다 기준이 달라져(초과 기준 건수·건당 단가) 고정 공식이 아님.
// 주 시작(수요일 YYYY-MM-DD) → { threshold(초과 기준), unit(건당 원) }. Storage(settlement/promo-rules.json).
// 프로모션(세전) = max(0, 09~00시완료 − threshold) × unit. 규칙 없는 주는 0.

const BUCKET = "settlement";
const PATH = "promo-rules.json";

export interface PromoRule {
  threshold: number; // 초과 기준 건수(이 건수 초과분부터 지급)
  unit: number; // 건당 지급액(원)
}
export type PromoRules = Record<string, PromoRule>; // key = 주 시작(수요일)

export async function loadPromoRules(): Promise<PromoRules> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: PromoRules = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v && typeof v === "object") {
        const t = Number((v as { threshold?: unknown }).threshold);
        const u = Number((v as { unit?: unknown }).unit);
        if (Number.isFinite(t) && Number.isFinite(u) && t >= 0 && u >= 0) out[k] = { threshold: t, unit: u };
      }
    }
    return out;
  } catch {
    return {};
  }
}

export async function savePromoRulesMap(rules: PromoRules): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const body = Buffer.from(JSON.stringify(rules), "utf-8");
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, body, {
    upsert: true,
    contentType: "application/json; charset=utf-8",
  });
  if (error) throw new Error(error.message);
}

/** 주 시작(수요일)의 프로모션 지급액(세전). 규칙 없으면 0. */
export function promoForWeek(rules: PromoRules, weekStart: string, inHoursCompleted: number): number {
  const r = rules[weekStart];
  if (!r) return 0;
  return Math.max(0, inHoursCompleted - r.threshold) * r.unit;
}
