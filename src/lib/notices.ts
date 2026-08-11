// 공지사항 조회 — 라이더(게시분만)·관리자(전체)·홈 배너(featured). service_role 전용.
// 라이더/홈은 세션 불필요(전역 공지). env 없으면 데모 폴백.
import "server-only";
import type { NoticeRow } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

function hasEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const DEMO_NOTICES: NoticeRow[] = [
  {
    id: "demo-1",
    title: "🎉 슬라이더 정식 오픈 안내",
    body: "<p>안녕하세요, <strong>슬라이더</strong>가 정식 오픈했습니다. 배달일지·등급·출석체크를 한 곳에서 확인해보세요!</p>",
    excerpt: "슬라이더가 정식 오픈했습니다. 배달일지·등급·출석체크를 한 곳에서.",
    is_published: true,
    is_pinned: true,
    is_important: true,
    is_featured: true,
    is_public: true,
    view_count: 128,
    published_at: "2026-08-10T00:00:00Z",
    created_at: "2026-08-10T00:00:00Z",
    updated_at: "2026-08-10T00:00:00Z",
  },
  {
    id: "demo-2",
    title: "정산 기준 안내",
    body: "<p>주간 정산은 <strong>수요일~화요일</strong> 기준으로 집계됩니다. 자세한 내용은 공지를 확인해주세요.</p>",
    excerpt: "주간 정산은 수요일~화요일 기준으로 집계됩니다.",
    is_published: true,
    is_pinned: false,
    is_important: false,
    is_featured: false,
    is_public: false,
    view_count: 42,
    published_at: "2026-08-08T00:00:00Z",
    created_at: "2026-08-08T00:00:00Z",
    updated_at: "2026-08-08T00:00:00Z",
  },
];

// 0022(is_public/view_count) 라이브 적용 전의 행도 안전하게 — 누락 컬럼 기본값 보정.
function normalizeNotice(row: NoticeRow): NoticeRow {
  return {
    ...row,
    is_public: (row.is_public as boolean | undefined) ?? false,
    view_count: (row.view_count as number | undefined) ?? 0,
  };
}

async function admin() {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  return createAdminClient();
}

/** 라이더 목록 — 게시된 공지, 고정 우선·최신순. */
export async function getPublishedNotices(): Promise<NoticeRow[]> {
  if (DEMO_MODE || !hasEnv()) return DEMO_NOTICES.filter((n) => n.is_published);
  try {
    const db = await admin();
    const { data, error } = await db
      .from("notices")
      .select("*")
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) {
      console.error("[notices] 목록 조회 실패:", error.code, error.message);
      return [];
    }
    return ((data ?? []) as NoticeRow[]).map(normalizeNotice);
  } catch (e) {
    console.error("[notices] 목록 예외:", e);
    return [];
  }
}

/** 라이더 상세 — 게시된 공지만(비공개면 null). */
export async function getPublishedNotice(id: string): Promise<NoticeRow | null> {
  if (DEMO_MODE || !hasEnv()) return DEMO_NOTICES.find((n) => n.id === id && n.is_published) ?? null;
  try {
    const db = await admin();
    const { data, error } = await db
      .from("notices")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (error) {
      console.error("[notices] 상세 조회 실패:", error.code, error.message);
      return null;
    }
    return data ? normalizeNotice(data as NoticeRow) : null;
  } catch (e) {
    console.error("[notices] 상세 예외:", e);
    return null;
  }
}

/** 홈 배너 — 게시 + featured 중 최신 1건. */
export async function getFeaturedNotice(): Promise<NoticeRow | null> {
  if (DEMO_MODE || !hasEnv()) {
    return DEMO_NOTICES.find((n) => n.is_published && n.is_featured) ?? null;
  }
  try {
    const db = await admin();
    const { data, error } = await db
      .from("notices")
      .select("*")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[notices] featured 조회 실패:", error.code, error.message);
      return null;
    }
    return data ? normalizeNotice(data as NoticeRow) : null;
  } catch (e) {
    console.error("[notices] featured 예외:", e);
    return null;
  }
}

/** 관리자 목록 — 전체(초안 포함), 최근 수정순. */
export async function getAllNotices(): Promise<NoticeRow[]> {
  if (!hasEnv()) return [];
  try {
    const db = await admin();
    const { data, error } = await db.from("notices").select("*").order("updated_at", { ascending: false });
    if (error) {
      console.error("[notices] 관리자 목록 실패:", error.code, error.message);
      return [];
    }
    return ((data ?? []) as NoticeRow[]).map(normalizeNotice);
  } catch (e) {
    console.error("[notices] 관리자 목록 예외:", e);
    return [];
  }
}

/** 관리자 상세(편집용) — 초안 포함 단건. */
export async function getNoticeForAdmin(id: string): Promise<NoticeRow | null> {
  if (!hasEnv()) return null;
  try {
    const db = await admin();
    const { data, error } = await db.from("notices").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[notices] 관리자 상세 실패:", error.code, error.message);
      return null;
    }
    return data ? normalizeNotice(data as NoticeRow) : null;
  } catch (e) {
    console.error("[notices] 관리자 상세 예외:", e);
    return null;
  }
}
