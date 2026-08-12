import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 정산 기타 메모 — 단일 전역 노트. 별도 테이블/마이그레이션 없이 Supabase Storage 에 텍스트로 저장.
// 정산 서버(service_role)만 접근(버킷 비공개). 버킷은 최초 저장 시 자동 생성.

const BUCKET = "settlement";
const MEMO_PATH = "memo.md";

export interface SettlementMemo {
  content: string;
}

/** 저장된 기타 메모 로드. 없으면 빈 문자열. */
export async function loadSettlementMemo(): Promise<SettlementMemo> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(BUCKET).download(MEMO_PATH);
    if (error || !data) return { content: "" };
    return { content: await data.text() };
  } catch {
    return { content: "" };
  }
}

/** 기타 메모 저장(덮어쓰기). 버킷 없으면 생성 후 업로드. */
export async function saveSettlementMemoContent(content: string): Promise<void> {
  const supabase = createAdminClient();
  // 버킷 없으면 생성(있으면 에러 무시). 비공개 버킷.
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(MEMO_PATH, Buffer.from(content, "utf-8"), {
      upsert: true,
      contentType: "text/plain; charset=utf-8",
    });
  if (error) throw new Error(error.message);
}
