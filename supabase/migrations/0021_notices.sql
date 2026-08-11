-- ───────────────────────────────────────────────────────────
-- jangboooo — 0021 공지사항(notices)
-- 관리자 작성(리치 텍스트 HTML)·라이더 열람. RLS enable + 정책 없음 = service_role 전용.
-- 라이더 /notice(목록·상세)와 메인 홈 featured 배너에서 조회. ADDITIVE.
-- ───────────────────────────────────────────────────────────
create table if not exists public.notices (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  body          text        not null default '',   -- 리치 텍스트(sanitized HTML)
  excerpt       text,                                -- 홈/강조 노출용 짧은 요약(선택, 미입력 시 본문에서 파생)
  is_published  boolean     not null default false,  -- 게시 여부(라이더 노출)
  is_pinned     boolean     not null default false,  -- 목록 상단 고정
  is_important  boolean     not null default false,  -- '중요' 배지
  is_featured   boolean     not null default false,  -- 메인 홈 배너 노출(제목 강조)
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_notices_published
  on public.notices (is_published, is_pinned desc, published_at desc);

alter table public.notices enable row level security; -- 정책 없음 = service_role 전용

comment on table public.notices is '공지사항 — 관리자 작성/라이더 열람. body=sanitized HTML. service_role 전용';
comment on column public.notices.is_featured is '메인 홈 배너에 제목 강조 노출';
