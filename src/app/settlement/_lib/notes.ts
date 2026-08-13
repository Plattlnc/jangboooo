import "server-only";
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// 라이더별 특이사항·메모·주민번호 — 라이더 ID 로 귀속. 날짜 무관하게 한 번 작성하면 유지.
// 별도 테이블/마이그레이션 없이 Supabase Storage(비공개 버킷)에 JSON 맵으로 저장.
// 주민번호(민감정보)는 AES-256-GCM 으로 암호화해 저장(키는 SESSION_SECRET 파생).

const BUCKET = "settlement";
const NOTES_PATH = "rider-notes.json"; // 특이사항
const MEMOS_PATH = "rider-memos.json"; // 메모(라이더↔ID 사이 칸)
const RRN_PATH = "rider-rrn.enc.json"; // 주민번호(암호문)

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

// ── 주민번호(민감정보) — AES-256-GCM 암호화 저장 ──
// 키: SESSION_SECRET(서명용, 프로덕션 설정됨)에서 scrypt 파생. 별도 env 불필요.
function rrnKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET not set (>=16 chars required)");
  return scryptSync(secret, "slider-rrn-v1", 32);
}

function encryptRrn(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64"); // iv(12)+tag(16)+ct
}

function decryptRrn(b64: string, key: Buffer): string {
  try {
    const buf = Buffer.from(b64, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

/** 저장된 라이더별 주민번호 맵({riderId: 평문}). 복호화 실패/키 미설정 시 빈 객체. */
export async function loadRiderRrns(): Promise<Record<string, string>> {
  let key: Buffer;
  try {
    key = rrnKey();
  } catch {
    return {};
  }
  const enc = await loadMap(RRN_PATH); // {id: 암호문(base64)}
  const out: Record<string, string> = {};
  for (const [id, v] of Object.entries(enc)) {
    const plain = decryptRrn(v, key);
    if (plain) out[id] = plain;
  }
  return out;
}

/** 라이더별 주민번호 맵 저장(평문 입력 → 암호화). */
export async function saveRiderRrnsMap(rrns: Record<string, string>): Promise<void> {
  const key = rrnKey();
  const enc: Record<string, string> = {};
  for (const [id, v] of Object.entries(rrns)) {
    if (v && v.trim()) enc[id] = encryptRrn(v.trim(), key);
  }
  await saveMap(RRN_PATH, enc);
}

/** 라이더 명부(특이사항 기록 대상) — 전체, 이름순. */
export async function loadSettlementRiders(): Promise<SettlementRider[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("riders").select("admin_rider_id, name");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => ({ id: r.admin_rider_id, name: r.name ?? r.admin_rider_id }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
