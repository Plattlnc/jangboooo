-- 라이더 관리(디렉터리) RPC (2026-08-15) — 정산 '라이더 관리' 탭 목록.
-- 전 라이더 × 계약상태(rider_contract_status) × 배민 활동요약(sla_snapshots 집계) 1콜.
-- service_role 전용(정산 페이지 admin 클라이언트). RLS 우회는 service_role 특성.

create or replace function public.get_rider_directory()
returns table(
  admin_rider_id  text,
  name            text,
  phone           text,
  region          text,
  center_id       text,
  created_at      timestamptz,
  is_active       boolean,
  contract_status text,
  is_terminated   boolean,
  last_active     date,
  active_days     bigint,
  total_completed bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  -- 라이더 전체 = 배민 riders ∪ grider 계약상태(rider_contract_status). 어느 한쪽에만 있어도 포함.
  with ids as (
    select admin_rider_id from public.riders
    union
    select admin_rider_id from public.rider_contract_status
  )
  select
    i.admin_rider_id,
    coalesce(r.name, c.rider_name),
    coalesce(r.phone, c.phone),
    r.region, r.center_id, r.created_at, coalesce(r.is_active, false),
    c.status, coalesce(c.is_terminated, false),
    s.last_active, coalesce(s.active_days, 0), coalesce(s.total_completed, 0)
  from ids i
  left join public.riders r on r.admin_rider_id = i.admin_rider_id
  left join public.rider_contract_status c on c.admin_rider_id = i.admin_rider_id
  left join (
    select admin_rider_id,
           max(snapshot_date) as last_active,
           count(*)           as active_days,
           sum(completed)     as total_completed
    from public.sla_snapshots
    group by admin_rider_id
  ) s on s.admin_rider_id = i.admin_rider_id
  order by coalesce(r.name, c.rider_name)
$$;

revoke all on function public.get_rider_directory() from public, anon, authenticated;
grant execute on function public.get_rider_directory() to service_role;
