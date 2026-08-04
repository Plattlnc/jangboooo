-- 앱 사용 현황 집계 (2026-08-04) — 관리자 > 사용 현황 화면용.
-- app_visits: 라이더 앱 오픈(문서 요청) 1건 = 1행. 미들웨어가 service role 로 적재.
--   RSC 새로고침(60s 폴링)·클라 내비·프리페치는 제외 — "앱을 연 횟수"에 가까운 지표.
-- get_app_usage: KST 달력일 기준 일별 방문수·활성 라이더수(고유). service role 전용.
-- idempotent — 재실행 안전.

create table if not exists public.app_visits (
  id             bigint generated always as identity primary key,
  admin_rider_id text not null,
  path           text not null default '/dashboard',
  visited_at     timestamptz not null default now()
);

create index if not exists app_visits_visited_at_idx on public.app_visits (visited_at desc);

alter table public.app_visits enable row level security; -- 정책 없음 = service role 전용

create or replace function public.get_app_usage(p_days integer default 14)
returns table(day date, visits bigint, riders bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (visited_at at time zone 'Asia/Seoul')::date as day,
    count(*)::bigint as visits,
    count(distinct admin_rider_id)::bigint as riders
  from public.app_visits
  where visited_at >= now() - make_interval(days => p_days)
  group by 1
  order by 1 desc
$$;
