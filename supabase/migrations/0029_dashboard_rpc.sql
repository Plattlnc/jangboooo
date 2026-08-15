-- 대시보드 집계 RPC (2026-08-16) — 정산 홈(대시보드) 회사 현황.
-- service_role 전용(정산 페이지 admin 클라이언트).

-- 일별 회사 전체 완료건수 + 활동 라이더수 (최근 p_days 일).
create or replace function public.get_daily_completed(p_days integer default 14)
returns table(day date, completed bigint, riders bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select s.snapshot_date, coalesce(sum(s.completed), 0), count(distinct s.admin_rider_id)
  from public.sla_snapshots s
  where s.snapshot_date > (select max(snapshot_date) from public.sla_snapshots) - p_days
  group by s.snapshot_date
  order by s.snapshot_date desc
$$;

-- 주간(수~화) 회사 배달처리비/본사미션/완료건/활동라이더 합계 (rider_daily_fees).
create or replace function public.get_week_settlement_totals(p_start date, p_end date)
returns table(fee_total bigint, mission_total bigint, completed_total bigint, active_riders bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(f.fee_krw), 0),
    coalesce(sum(f.mission_krw), 0),
    coalesce(sum(f.completed_cnt), 0),
    count(distinct f.admin_rider_id)
  from public.rider_daily_fees f
  where f.snapshot_date between p_start and p_end
$$;

revoke all on function public.get_daily_completed(integer) from public, anon, authenticated;
grant execute on function public.get_daily_completed(integer) to service_role;
revoke all on function public.get_week_settlement_totals(date, date) from public, anon, authenticated;
grant execute on function public.get_week_settlement_totals(date, date) to service_role;
