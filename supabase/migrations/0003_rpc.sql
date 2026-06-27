-- ───────────────────────────────────────────────────────────
-- jangboooo — 0003 RPC
--   1) bind_rider_by_phone  : 본인인증 후 계정-라이더 바인딩 (service_role 전용)
--   2) get_rider_summary    : 기간(오늘/주/월) 집계 요약
--   3) get_rider_daily      : 기간 내 일별 시계열
--   4) get_rider_hourly     : 기간 피크시간대 실적
-- 작성: backend (Task #5)
-- ───────────────────────────────────────────────────────────

-- ── 바인딩 ──────────────────────────────────────────────────────
-- 보안: 이 함수는 p_phone 을 "이미 본인인증 완료된 휴대폰"으로 신뢰한다.
-- 따라서 authenticated 에게 EXECUTE 를 부여하지 않고, 서버(서비스 롤)가
-- 본인인증 검증 직후에만 호출한다. 호출자가 user_id 를 명시 전달.
create or replace function public.bind_rider_by_phone(
  p_user_id         uuid,
  p_phone           text,
  p_verify_provider text default null
)
returns public.rider_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm  text := public.normalize_phone(p_phone);
  v_rider public.riders;
  v_acct  public.rider_accounts;
begin
  if p_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if v_norm is null then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;

  -- 멱등: 이미 바인딩된 계정이면 그대로 반환
  select * into v_acct from public.rider_accounts where user_id = p_user_id;
  if found then
    return v_acct;
  end if;

  -- admin 명단에서 휴대폰 매칭 (활성 라이더)
  select * into v_rider
    from public.riders
   where phone_norm = v_norm and is_active
   order by updated_at desc
   limit 1;
  if not found then
    raise exception 'RIDER_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 해당 라이더가 다른 계정에 이미 묶였는지
  if exists (select 1 from public.rider_accounts where admin_rider_id = v_rider.admin_rider_id) then
    raise exception 'RIDER_ALREADY_BOUND' using errcode = '23505';
  end if;

  insert into public.rider_accounts (user_id, admin_rider_id, verified_phone, verify_provider)
  values (p_user_id, v_rider.admin_rider_id, v_norm, p_verify_provider)
  returning * into v_acct;

  return v_acct;
end;
$$;
revoke all on function public.bind_rider_by_phone(uuid, text, text) from public, anon, authenticated;
grant execute on function public.bind_rider_by_phone(uuid, text, text) to service_role;

-- ── 기간 범위 (KST 기준) ────────────────────────────────────────
-- today: 당일 / week: 이번 주(월요일 시작) / month: 이번 달 1일 시작.
create or replace function public.sla_period_range(p_period text, p_ref date default null)
returns table(start_date date, end_date date)
language plpgsql
immutable
as $$
declare
  v_ref date := coalesce(p_ref, (now() at time zone 'Asia/Seoul')::date);
begin
  if p_period = 'today' then
    start_date := v_ref;
    end_date   := v_ref;
  elsif p_period = 'week' then
    start_date := v_ref - (extract(isodow from v_ref)::int - 1);  -- 월요일
    end_date   := v_ref;
  elsif p_period = 'month' then
    start_date := date_trunc('month', v_ref)::date;
    end_date   := v_ref;
  else
    raise exception 'INVALID_PERIOD: %', p_period using errcode = '22023';
  end if;
  return next;
end;
$$;

-- ── 요약 집계 ───────────────────────────────────────────────────
-- 집계 규칙(가정 — 관리시스템 원본 의미 확정 시 조정):
--   · 카운트(완료/거절/배차취소/배달취소/배차)는 기간 합산.
--   · sla_score 기간값 = 완료건 가중평균(완료 0 이면 단순평균).
--   · acceptance_rate 기간값 = assigned>0 이면 (assigned-rejected)/assigned*100,
--     아니면 일별 원본 acceptance_rate 의 평균.
create or replace function public.get_rider_summary(p_period text, p_ref date default null)
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
    public.current_admin_rider_id(),
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
    on s.admin_rider_id = public.current_admin_rider_id()
   and s.snapshot_date between r.start_date and r.end_date
  group by r.start_date, r.end_date;
$$;
grant execute on function public.get_rider_summary(text, date) to authenticated;

-- ── 일별 시계열 ─────────────────────────────────────────────────
create or replace function public.get_rider_daily(p_period text, p_ref date default null)
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
  where s.admin_rider_id = public.current_admin_rider_id()
    and s.snapshot_date between r.start_date and r.end_date
  order by s.snapshot_date;
$$;
grant execute on function public.get_rider_daily(text, date) to authenticated;

-- ── 피크시간대 실적 (0~23시 전 구간, 데이터 없으면 0) ────────────
create or replace function public.get_rider_hourly(p_period text, p_ref date default null)
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
    on s.admin_rider_id = public.current_admin_rider_id()
   and s.snapshot_date between r.start_date and r.end_date
   and s.hour = g.hour
  group by g.hour
  order by g.hour;
$$;
grant execute on function public.get_rider_hourly(text, date) to authenticated;
