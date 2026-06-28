-- ───────────────────────────────────────────────────────────
-- jangboooo — 0007 공동목표 RLS + RPC
-- 커스텀 세션 인증(0005 `_for` 패턴)을 따른다: 앱이 서명세션 검증 후 admin_rider_id 를
-- 명시 인자로 넘겨 service_role 로 호출. anon/authenticated 직접 호출 금지.
-- 작성: backend
-- ───────────────────────────────────────────────────────────

alter table public.center_peak_goals enable row level security;
grant select on public.center_peak_goals to authenticated;

-- 방어적 RLS: authenticated 는 본인 센터 행만(레거시 auth.uid 경로 호환). 실경로는 service_role RPC.
drop policy if exists center_peak_goals_select_own on public.center_peak_goals;
create policy center_peak_goals_select_own on public.center_peak_goals
  for select to authenticated
  using (
    center_id = (
      select r.center_id from public.riders r
      where r.admin_rider_id = public.current_admin_rider_id()
    )
  );

-- ── 라이더 센터의 최신 4피크 공동목표 ───────────────────────────
-- 센터 해석: riders.center_id → 없으면 최신 적재 센터로 폴백(단일센터 배포 가정).
-- 기준 영업일: p_ref → 없으면 그 센터의 최신 snapshot_date.
-- 데이터 없는 피크도 4행 항상 반환(current/goal/pct = null → UI '—').
create or replace function public.get_center_goals_for(
  p_admin_rider_id text,
  p_ref            date default null
)
returns table(
  peak_key   text,
  peak_order int,
  label      text,
  current    integer,
  goal       integer,
  pct        integer,
  snapshot_date date,
  center_id  text
)
language sql
stable
security invoker
set search_path = public
as $$
  with center as (
    select coalesce(
      (select r.center_id from public.riders r where r.admin_rider_id = p_admin_rider_id),
      (select g.center_id from public.center_peak_goals g order by g.captured_at desc limit 1)
    ) as cid
  ),
  ref as (
    select c.cid,
           coalesce(
             p_ref,
             (select max(g.snapshot_date) from public.center_peak_goals g where g.center_id = c.cid)
           ) as sdate
    from center c
  ),
  keys(peak_key, peak_order, label) as (
    values ('ml', 0, '아침점심'), ('pl', 1, '오후논피크'), ('d', 2, '저녁피크'), ('pd', 3, '심야논피크')
  )
  select
    k.peak_key,
    k.peak_order,
    k.label,
    g.current,
    g.goal,
    g.pct,
    ref.sdate,
    ref.cid
  from keys k
  cross join ref
  left join public.center_peak_goals g
    on g.center_id = ref.cid
   and g.snapshot_date = ref.sdate
   and g.peak_key = k.peak_key
  order by k.peak_order;
$$;

-- service_role 전용(앱이 서명세션 검증 후 호출). anon/authenticated 직접 실행 금지.
revoke all on function public.get_center_goals_for(text, date) from public, anon, authenticated;
grant execute on function public.get_center_goals_for(text, date) to service_role;
