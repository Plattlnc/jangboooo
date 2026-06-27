-- ───────────────────────────────────────────────────────────
-- jangboooo — 0002 RLS (라이더는 본인 데이터만)
-- 스크래퍼/서버 액션은 service_role 키 사용 → RLS 우회.
-- 작성: backend (Task #5)
-- ───────────────────────────────────────────────────────────

-- 현재 사용자(auth.uid)에 바인딩된 admin_rider_id.
-- SECURITY DEFINER: rider_accounts 의 RLS 재귀를 피하면서 auth.uid 로만 필터.
create or replace function public.current_admin_rider_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select admin_rider_id from public.rider_accounts where user_id = auth.uid();
$$;

alter table public.riders             enable row level security;
alter table public.rider_accounts      enable row level security;
alter table public.sla_snapshots      enable row level security;
alter table public.rider_hourly_stats enable row level security;

-- 테이블 권한(RLS 가 행 단위로 다시 제한). 쓰기 권한은 부여하지 않음.
grant select on public.riders             to authenticated;
grant select on public.rider_accounts      to authenticated;
grant select on public.sla_snapshots      to authenticated;
grant select on public.rider_hourly_stats to authenticated;

-- riders: 본인 명단 행만 조회
drop policy if exists riders_select_own on public.riders;
create policy riders_select_own on public.riders
  for select to authenticated
  using (admin_rider_id = public.current_admin_rider_id());

-- rider_accounts: 본인 바인딩만 조회 (생성/수정은 RPC·service_role 전용)
drop policy if exists rider_accounts_select_own on public.rider_accounts;
create policy rider_accounts_select_own on public.rider_accounts
  for select to authenticated
  using (user_id = auth.uid());

-- sla_snapshots: 본인 데이터만 조회
drop policy if exists sla_snapshots_select_own on public.sla_snapshots;
create policy sla_snapshots_select_own on public.sla_snapshots
  for select to authenticated
  using (admin_rider_id = public.current_admin_rider_id());

-- rider_hourly_stats: 본인 데이터만 조회
drop policy if exists rider_hourly_select_own on public.rider_hourly_stats;
create policy rider_hourly_select_own on public.rider_hourly_stats
  for select to authenticated
  using (admin_rider_id = public.current_admin_rider_id());
