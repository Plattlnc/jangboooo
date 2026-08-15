-- 라이더 계약상태 (2026-08-15) — 정산 화면 '계약종료' 뱃지 소스.
-- 소스: grider 라이더 관리(/partners/riders) 계약상태 컬럼(계약중/계약종료). 스크래퍼가 하루 1회 전량 upsert.
-- 탈퇴(계약종료) 라이더 식별 → 정산·차감 등에서 뱃지 표기. additive·멱등.

create table if not exists public.rider_contract_status (
  admin_rider_id text primary key,          -- grider 라이더ID (= User ID)
  rider_name     text,
  phone          text,
  status         text not null,             -- '계약중' | '계약종료' (원문)
  is_terminated  boolean not null default false,
  captured_at    timestamptz not null default now()
);

create index if not exists rider_contract_status_terminated_idx
  on public.rider_contract_status (is_terminated) where is_terminated;

alter table public.rider_contract_status enable row level security; -- 정책 없음 = service role 전용
