-- 라이더 배달 랭킹 (2026-07-31) — 커뮤니티 > 랭킹 화면용.
-- 기간(sla_period_range: today/week/month) 내 완료건 합 기준 전 라이더 순위.
-- 완료 0건 라이더는 제외(활동자만 랭킹). 동률은 같은 순위(rank), 다음 순위는 건너뜀.
-- DB 측 집계라 페이지네이션(PostgREST 1000행) 문제 없음. service_role(서버)에서 호출.
-- idempotent — 재실행 안전.

create or replace function public.get_rider_ranking(
  p_period text,
  p_ref    date default null
)
returns table(
  rnk            bigint,
  admin_rider_id text,
  rider_name     text,
  avatar_path    text,
  completed      bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with pr as (
    select start_date, end_date from public.sla_period_range(p_period, p_ref)
  ),
  sums as (
    select s.admin_rider_id, sum(s.completed)::bigint as completed
    from public.sla_snapshots s, pr
    where s.snapshot_date between pr.start_date and pr.end_date
    group by s.admin_rider_id
    having sum(s.completed) > 0
  )
  select
    rank() over (order by su.completed desc) as rnk,
    su.admin_rider_id,
    coalesce(r.name, su.admin_rider_id) as rider_name,
    r.avatar_path,
    su.completed
  from sums su
  left join public.riders r on r.admin_rider_id = su.admin_rider_id
  order by su.completed desc, coalesce(r.name, su.admin_rider_id) asc
$$;
