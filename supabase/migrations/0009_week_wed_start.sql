-- ───────────────────────────────────────────────────────────
-- jangboooo — 0009 주간 기준 변경: 수요일 시작 ~ 화요일 종료
-- 기존(0003): 월요일 시작. 변경: 매주 수요일 리셋(수~화 주기).
-- sla_period_range 는 get_rider_summary(_for)/get_rider_hourly(_for) 의 공통 기간 소스라,
-- 이 함수 하나만 교체하면 배달현황·피크·시간대 집계가 모두 수~화 기준으로 통일됨.
-- ───────────────────────────────────────────────────────────
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
    -- 주간: 수요일 시작 ~ 화요일 종료. 가장 최근 수요일(오늘 포함)로 앵커.
    -- isodow: 월1..일7, 수=3. (isodow-3+7)%7 = 지난 수요일까지의 일수.
    start_date := v_ref - ((extract(isodow from v_ref)::int - 3 + 7) % 7);
    end_date   := v_ref; -- 주중 누적(수요일~오늘). 주 경계는 매주 수요일 리셋.
  elsif p_period = 'month' then
    start_date := date_trunc('month', v_ref)::date;
    end_date   := v_ref;
  else
    raise exception 'INVALID_PERIOD: %', p_period using errcode = '22023';
  end if;
  return next;
end;
$$;
