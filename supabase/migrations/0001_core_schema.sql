-- ───────────────────────────────────────────────────────────
-- jangboooo — 0001 코어 스키마
-- riders / rider_accounts / sla_snapshots / rider_hourly_stats
-- 식별키: admin_rider_id (관리시스템 라이더 고유 ID)
-- 작성: backend (Task #5)
-- ───────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── 휴대폰 정규화: 숫자만 추출(매칭 키). 빈 값은 null ────────────
create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g'), '');
$$;

-- ── riders: 관리시스템 라이더 명단 (스크래퍼가 service_role 로 upsert) ──
create table if not exists public.riders (
  admin_rider_id text primary key,
  name           text,
  phone          text,                                   -- 원본 표기
  phone_norm     text generated always as (public.normalize_phone(phone)) stored, -- 본인인증 매칭 키
  region         text,
  is_active      boolean     not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists riders_phone_norm_idx on public.riders (phone_norm);

-- ── rider_accounts: 카카오 계정(auth.users) ↔ 라이더 1:1 바인딩 ───
-- 바인딩은 본인인증(휴대폰) 후 bind_rider_by_phone() 로만 생성(0003).
create table if not exists public.rider_accounts (
  user_id         uuid        primary key references auth.users(id) on delete cascade,
  admin_rider_id  text        not null unique references public.riders(admin_rider_id) on delete restrict,
  verified_phone  text        not null,                  -- 본인인증된 휴대폰(정규화)
  verify_provider text,
  verified_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists rider_accounts_admin_rider_id_idx on public.rider_accounts (admin_rider_id);

-- ── sla_snapshots: 라이더별 / 영업일별 누적 스냅샷 ───────────────
-- 스크래퍼가 1분 주기로 (admin_rider_id, snapshot_date) 단위 upsert.
-- 값은 "해당 영업일 누적치"(매 영업일 0 부터). captured_at 으로 신선도 추적.
create table if not exists public.sla_snapshots (
  id                bigint generated always as identity primary key,
  admin_rider_id    text not null references public.riders(admin_rider_id) on delete cascade,
  snapshot_date     date not null,                       -- 영업일(KST 기준, 스크래퍼가 결정)
  captured_at       timestamptz not null default now(),
  sla_score         numeric(6,2),                        -- 관리시스템 SLA 점수(원본)
  completed         integer not null default 0,          -- 완료
  rejected          integer not null default 0,          -- 거절
  dispatch_canceled integer not null default 0,          -- 배차취소
  delivery_canceled integer not null default 0,          -- 배달취소
  assigned          integer not null default 0,          -- 배차 제안 총건(수락률 분모)
  acceptance_rate   numeric(5,2),                         -- 수락률 원본(%) — 없으면 집계에서 파생
  constraint sla_snapshots_rider_date_uniq unique (admin_rider_id, snapshot_date)
);
create index if not exists sla_snapshots_rider_date_idx on public.sla_snapshots (admin_rider_id, snapshot_date desc);

-- ── rider_hourly_stats: 피크시간대 실적 (영업일 × 시간 누적) ─────
create table if not exists public.rider_hourly_stats (
  id             bigint generated always as identity primary key,
  admin_rider_id text     not null references public.riders(admin_rider_id) on delete cascade,
  snapshot_date  date     not null,
  hour           smallint not null check (hour between 0 and 23),
  completed      integer  not null default 0,
  captured_at    timestamptz not null default now(),
  constraint rider_hourly_rider_date_hour_uniq unique (admin_rider_id, snapshot_date, hour)
);
create index if not exists rider_hourly_rider_date_idx on public.rider_hourly_stats (admin_rider_id, snapshot_date);

-- ── updated_at 자동 갱신 ────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists riders_touch_updated_at on public.riders;
create trigger riders_touch_updated_at
  before update on public.riders
  for each row execute function public.touch_updated_at();
