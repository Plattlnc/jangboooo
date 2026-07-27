-- ───────────────────────────────────────────────────────────
-- jangboooo — 0014 제휴 정비소 (관리자 직접 등록)
-- 관리자(/admin/repair-shops)가 등록 → 라이더 '내 주변 정비소'(/repair)에 노출.
-- RLS enable + 정책 없음 = service_role(서버 액션/서버 컴포넌트) 전용 접근.
-- ───────────────────────────────────────────────────────────
create table if not exists public.repair_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.repair_shops enable row level security;

comment on table public.repair_shops is '제휴 정비소 — 관리자 등록, 라이더 내주변정비소 화면 노출';
comment on column public.repair_shops.note is '영업시간·안내 등 자유 메모 (라이더 화면 노출)';
comment on column public.repair_shops.is_active is 'false = 라이더 화면에서 숨김 (삭제 대신 비활성)';
