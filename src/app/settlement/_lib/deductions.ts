import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 차감 정산 — 라이더별 시간제보험료 등 차감액. 라이더 ID 로 귀속, 별도 테이블/마이그레이션 없이
// Storage(settlement/rider-deductions.json) 에 JSON 맵({riderId: 원}) 저장. 금요일 정산 시 별도 차감.

const BUCKET = "settlement";
const PATH = "rider-deductions.json";

/** 저장된 라이더별 시간제보험료 차감액({riderId: 원}). 없으면 빈 객체. */
export async function loadRiderDeductions(): Promise<Record<string, number>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 시간제보험료(차감 정산 자동값) — 바로고 주차별 정산내역서 을지 F열 적재분(rider_weekly_insurance, 0025).
 * 최신 주차(week_start 내림차순) 기준 라이더별 금액 반환. 배민 배달처리비 파일엔 보험 시트가 없어
 * (2시트뿐) 이 주간 소스가 유일한 자동 경로.
 */
export async function loadScrapedInsurance(): Promise<{ byRider: Record<string, number>; latestDate: string | null; dates: string[] }> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("rider_weekly_insurance")
      .select("week_start, week_end, admin_rider_id, amount_krw")
      .order("week_start", { ascending: false })
      .limit(1000);
    if (error || !data?.length) return { byRider: {}, latestDate: null, dates: [] };
    const dates = [...new Set(data.map((r) => r.week_start))].sort();
    const latest = data[0].week_start; // 내림차순 첫 행 = 최신 주차
    const latestEnd = data[0].week_end;
    const byRider: Record<string, number> = {};
    for (const r of data) {
      if (r.week_start !== latest) continue;
      const n = Math.floor(Number(r.amount_krw));
      if (Number.isFinite(n) && n > 0) byRider[r.admin_rider_id] = n;
    }
    // latestDate 표시는 주차 범위(수~화)로 — 화면 '자동 기준' 라벨용.
    return { byRider, latestDate: `${latest} ~ ${latestEnd}`, dates };
  } catch {
    return { byRider: {}, latestDate: null, dates: [] };
  }
}

/** 라이더별 시간제보험료 차감액 맵 저장(덮어쓰기). 버킷 없으면 생성. */
export async function saveRiderDeductionsMap(map: Record<string, number>): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const body = Buffer.from(JSON.stringify(map), "utf-8");
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, body, {
    upsert: true,
    contentType: "application/json; charset=utf-8",
  });
  if (error) throw new Error(error.message);
}
