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
