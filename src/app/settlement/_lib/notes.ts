import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 라이더별 특이사항·메모 — 라이더 ID 로 귀속. 날짜 무관하게 한 번 작성하면 유지.
// 별도 테이블/마이그레이션 없이 Supabase Storage 에 JSON 맵({riderId: text})으로 저장.

const BUCKET = "settlement";
const NOTES_PATH = "rider-notes.json"; // 특이사항
const MEMOS_PATH = "rider-memos.json"; // 메모(라이더↔ID 사이 칸)

export interface SettlementRider {
  id: string;
  name: string;
}

/** Storage JSON 맵({riderId: text}) 로드 — 없으면 빈 객체. */
async function loadMap(path: string): Promise<Record<string, string>> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return {};
    const parsed = JSON.parse(await data.text());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

/** Storage JSON 맵 저장(덮어쓰기). 버킷 없으면 생성. */
async function saveMap(path: string, map: Record<string, string>): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const body = Buffer.from(JSON.stringify(map), "utf-8");
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    upsert: true,
    contentType: "application/json; charset=utf-8",
  });
  if (error) throw new Error(error.message);
}

/** 저장된 라이더별 특이사항 맵({riderId: note}). */
export const loadRiderNotes = (): Promise<Record<string, string>> => loadMap(NOTES_PATH);
/** 라이더별 특이사항 맵 저장. */
export const saveRiderNotesMap = (notes: Record<string, string>): Promise<void> => saveMap(NOTES_PATH, notes);
/** 저장된 라이더별 메모 맵({riderId: memo}). */
export const loadRiderMemos = (): Promise<Record<string, string>> => loadMap(MEMOS_PATH);
/** 라이더별 메모 맵 저장. */
export const saveRiderMemosMap = (memos: Record<string, string>): Promise<void> => saveMap(MEMOS_PATH, memos);

/** 라이더 명부(특이사항 기록 대상) — 전체, 이름순. */
export async function loadSettlementRiders(): Promise<SettlementRider[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("riders").select("admin_rider_id, name");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => ({ id: r.admin_rider_id, name: r.name ?? r.admin_rider_id }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
