-- ───────────────────────────────────────────────────────────
-- jangboooo — 0011 수락률을 배민 공식 산식으로 정합
-- 근거: 달성현황(beta) 리포트 명시 공식(2026-07-17 확인):
--   수락률 = (푸드 배달완료) / (푸드 배달완료 + 푸드 거절 + 푸드 취소 + 푸드 라이더귀책)
-- 구식(전 카테고리 (제안-거절)/제안)은 배차취소·귀책이 분자에 포함돼 과대평가.
-- 푸드별 원본 카운트는 sla_snapshots.breakdown jsonb(0004)에 보존돼 있어 소급 재계산 가능.
-- 한계: "권역 외 배차 제외"는 소스에서 식별 불가 — 공식 수치와 미세 오차 가능.
-- ───────────────────────────────────────────────────────────

-- 1) 일별 스냅샷 백필: breakdown 보유 전 행의 acceptance_rate 재계산.
update public.sla_snapshots s
set acceptance_rate = case when f.denom > 0 then round(100.0 * f.num / f.denom, 2) else null end
from (
  select id,
    coalesce((breakdown->'food'->>'complete')::numeric, 0) as num,
      coalesce((breakdown->'food'->>'complete')::numeric, 0)
    + coalesce((breakdown->'food'->>'reject')::numeric, 0)
    + coalesce((breakdown->'food'->>'cancel')::numeric, 0)
    + coalesce((breakdown->'food'->>'riderFault')::numeric, 0) as denom
  from public.sla_snapshots
  where breakdown is not null
) f
where s.id = f.id;

-- 2) 기간 요약 RPC: 기간 수락률도 푸드 합산 기준으로(0005 본문에서 수락률 식만 교체).
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
    -- 수락률(배민 공식): 기간 푸드완료 합 / 기간 푸드(완료+거절+취소+귀책) 합.
    -- breakdown 없는 과거 행은 0 기여 — 전 기간 무 breakdown 이면 일별 값 평균 폴백.
    round(
      case when coalesce(sum(
               coalesce((s.breakdown->'food'->>'complete')::numeric, 0)
             + coalesce((s.breakdown->'food'->>'reject')::numeric, 0)
             + coalesce((s.breakdown->'food'->>'cancel')::numeric, 0)
             + coalesce((s.breakdown->'food'->>'riderFault')::numeric, 0)), 0) > 0
           then 100.0 * sum(coalesce((s.breakdown->'food'->>'complete')::numeric, 0))
                / nullif(sum(
                    coalesce((s.breakdown->'food'->>'complete')::numeric, 0)
                  + coalesce((s.breakdown->'food'->>'reject')::numeric, 0)
                  + coalesce((s.breakdown->'food'->>'cancel')::numeric, 0)
                  + coalesce((s.breakdown->'food'->>'riderFault')::numeric, 0)), 0)
           else avg(s.acceptance_rate) end, 2),
    count(s.id)::int,
    max(s.captured_at)
  from r
  left join public.sla_snapshots s
    on s.admin_rider_id = p_admin_rider_id
   and s.snapshot_date between r.start_date and r.end_date
  group by r.start_date, r.end_date;
$$;

-- 3) 공동목표 goal 교정(주간 테이블 공식값, 2026-07-17 덤프 확인):
--    7/16 = goal 수집 루프 행(hang)으로 null, 7/17 = 파서 날짜버그로 월·화 값(399…) 오염.
update public.center_peak_goals g
set goal = v.goal,
    pct  = case when g.current is not null and v.goal > 0
                then least(100, round(100.0 * g.current / v.goal))
                else g.pct end
from (values
  ('2026-07-16'::date, 'ml', 399), ('2026-07-16'::date, 'pl', 380),
  ('2026-07-16'::date, 'd', 570),  ('2026-07-16'::date, 'pd', 551),
  ('2026-07-17'::date, 'ml', 589), ('2026-07-17'::date, 'pl', 418),
  ('2026-07-17'::date, 'd', 684),  ('2026-07-17'::date, 'pd', 589)
) as v(snapshot_date, peak_key, goal)
where g.snapshot_date = v.snapshot_date and g.peak_key = v.peak_key;
