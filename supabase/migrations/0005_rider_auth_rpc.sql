-- ───────────────────────────────────────────────────────────
-- jangboooo — 0005 라이더 ID/비번 인증 전환에 따른 데이터 RPC
-- 인증 모델 변경: Supabase Auth(카카오/본인인증) 제거 → 커스텀 서명 쿠키 세션.
--   더 이상 auth.uid() 컨텍스트가 없으므로, 서버(서명 세션 검증)가 admin_rider_id 를
--   명시 인자로 넘겨 service_role 로 호출하는 `_for` 집계 RPC 를 둔다.
-- 기존 get_rider_*(auth.uid 기반) 은 호환을 위해 남겨두되 신규 경로는 `_for` 사용.
-- 작성: backend (Task #19)
-- ───────────────────────────────────────────────────────────

-- 카카오 본인인증 바인딩 제거 → 관련 RPC 폐기.
drop function if exists public.bind_rider_by_phone(uuid, text, text);

-- ── 요약 집계 (admin_rider_id 명시) ─────────────────────────────
create or replace function public.get_rider_summary_for(
  p_admin_rider_id text,
  p_period         text,
  p_ref            date default null
)
returns table(
  period            text,
  start_date        date,
  end_date          date,
  admin_rider_id    text,
  sla_score         numeric,
  completed         bigint,
  rejected          bigint,
  dispatch_canceled bigint,
  delivery_canceled bigint,
  assigned          bigint,
  acceptance_rate   numeric,
  active_days       integer,
  last_captured_at  timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (select * from public.sla_period_range(p_period, p_ref))
  select
    p_period,
    r.start_date,
    r.end_date,
    p_admin_rider_id,
    round(
      case when coalesce(sum(s.completed), 0) > 0
           then sum(s.sla_score * s.completed) / nullif(sum(s.completed), 0)
           else avg(s.sla_score) end, 2),
    coalesce(sum(s.completed), 0),
    coalesce(sum(s.rejected), 0),
    coalesce(sum(s.dispatch_canceled), 0),
    coalesce(sum(s.delivery_canceled), 0),
    coalesce(sum(s.assigned), 0),
    round(
      case when coalesce(sum(s.assigned), 0) > 0
           then 100.0 * (sum(s.assigned) - sum(s.rejected)) / nullif(sum(s.assigned), 0)
           else avg(s.acceptance_rate) end, 2),
    count(s.id)::int,
    max(s.captured_at)
  from r
  left join public.sla_snapshots s
    on s.admin_rider_id = p_admin_rider_id
   and s.snapshot_date between r.start_date and r.end_date
  group by r.start_date, r.end_date;
$$;

-- ── 일별 시계열 (admin_rider_id 명시) ───────────────────────────
create or replace function public.get_rider_daily_for(
  p_admin_rider_id text,
  p_period         text,
  p_ref            date default null
)
returns table(
  snapshot_date     date,
  sla_score         numeric,
  completed         integer,
  rejected          integer,
  dispatch_canceled integer,
  delivery_canceled integer,
  assigned          integer,
  acceptance_rate   numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (select * from public.sla_period_range(p_period, p_ref))
  select s.snapshot_date, s.sla_score, s.completed, s.rejected,
         s.dispatch_canceled, s.delivery_canceled, s.assigned, s.acceptance_rate
  from public.sla_snapshots s, r
  where s.admin_rider_id = p_admin_rider_id
    and s.snapshot_date between r.start_date and r.end_date
  order by s.snapshot_date;
$$;

-- ── 피크시간대 실적 (admin_rider_id 명시, 0~23 전구간) ──────────
create or replace function public.get_rider_hourly_for(
  p_admin_rider_id text,
  p_period         text,
  p_ref            date default null
)
returns table(hour smallint, completed bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (select * from public.sla_period_range(p_period, p_ref))
  select g.hour::smallint, coalesce(sum(s.completed), 0)
  from r
  cross join generate_series(0, 23) as g(hour)
  left join public.rider_hourly_stats s
    on s.admin_rider_id = p_admin_rider_id
   and s.snapshot_date between r.start_date and r.end_date
   and s.hour = g.hour
  group by g.hour
  order by g.hour;
$$;

-- 서버(서명 세션 검증 후 service_role)만 호출. anon/authenticated 금지.
revoke all on function public.get_rider_summary_for(text, text, date) from public, anon, authenticated;
revoke all on function public.get_rider_daily_for(text, text, date)   from public, anon, authenticated;
revoke all on function public.get_rider_hourly_for(text, text, date)  from public, anon, authenticated;
grant execute on function public.get_rider_summary_for(text, text, date) to service_role;
grant execute on function public.get_rider_daily_for(text, text, date)   to service_role;
grant execute on function public.get_rider_hourly_for(text, text, date)  to service_role;
