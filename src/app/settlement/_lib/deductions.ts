import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 차감 정산 — 라이더별 시간제보험료(자동) + 수동 조정. 시간제보험료는 주차(수~화)별로 다르므로
// 주차별로 조회/기록한다. 자동값=rider_weekly_insurance(을지 F열, 0025), 수동 조정=Storage JSON
// (settlement/rider-deductions.json, {week_start:{riderId:원}}). 금요일 정산 시 별도 차감.

const BUCKET = "settlement";
const PATH = "rider-deductions.json";

export interface InsWeek {
  start: string;
  end: string;
}

/** 시간제보험료가 적재된 주차 목록(최신순). */
export async function listInsuranceWeeks(): Promise<InsWeek[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("rider_weekly_insurance")
      .select("week_start, week_end")
      .order("week_start", { ascending: false })
      .limit(1000);
    if (error || !data) return [];
    const seen = new Set<string>();
    const out: InsWeek[] = [];
    for (const r of data) {
      if (seen.has(r.week_start)) continue;
      seen.add(r.week_start);
      out.push({ start: r.week_start, end: r.week_end });
    }
    return out;
  } catch {
    return [];
  }
}

/** 특정 주차 시간제보험료(자동) — 라이더별 금액. */
export async function fetchInsuranceForWeek(weekStart: string): Promise<Record<string, number>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("rider_weekly_insurance")
      .select("admin_rider_id, amount_krw")
      .eq("week_start", weekStart)
      .limit(2000);
    if (error || !data) return {};
    const out: Record<string, number> = {};
    for (const r of data) {
      const n = Math.floor(Number(r.amount_krw));
      if (Number.isFinite(n) && n > 0) out[r.admin_rider_id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/** 수동 조정 전체 맵({week_start:{riderId:원}}). 레거시 평면 맵은 무시(주차 귀속 불가). */
async function loadAllManual(): Promise<Record<string, Record<string, number>>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const vals = Object.values(parsed as Record<string, unknown>);
    const isFlatLegacy = vals.length > 0 && vals.every((v) => typeof v === "number");
    if (isFlatLegacy) return {}; // 구 평면 포맷 — 주차 미상이라 버림(재입력)
    return parsed as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

/** 특정 주차 라이더별 수동 조정 차감액. */
export async function loadRiderDeductions(weekStart: string): Promise<Record<string, number>> {
  const all = await loadAllManual();
  const wk = all[weekStart] ?? {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(wk)) {
    const n = Math.floor(Number(v));
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

/** 특정 주차 수동 조정 맵 저장(해당 주차만 갱신, 다른 주차 보존). */
export async function saveRiderDeductionsForWeek(weekStart: string, map: Record<string, number>): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const all = await loadAllManual();
  all[weekStart] = map;
  const body = Buffer.from(JSON.stringify(all), "utf-8");
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, body, {
    upsert: true,
    contentType: "application/json; charset=utf-8",
  });
  if (error) throw new Error(error.message);
}
