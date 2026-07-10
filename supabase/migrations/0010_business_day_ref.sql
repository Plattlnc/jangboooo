-- ───────────────────────────────────────────────────────────
-- jangboooo — 0010 기간 기준일을 배민 영업일로 정렬 (06:00 ~ 익일 05:59 KST)
-- 문제: v_ref 가 KST 자정 경계 날짜 → 스크래퍼 snapshot_date(businessDayInTz, -6h)와
--       불일치. 매일 00:00~05:59 KST 에 '오늘' 조회가 빈 집합이 되어 대시보드가
--       빈 데이터 + 갱신지연으로 표시됨(2026-07-11 새벽 실증).
-- 수정: ref 미지정 시 (now KST - 6h)::date = 영업일. 주간(수~화)/월간도 같은 앵커.
--       주간/월간 경계 자체는 0009 로직 그대로 — 새벽 시간대 앵커만 전일로 당겨짐.
-- ───────────────────────────────────────────────────────────
create or replace function public.sla_period_range(p_period text, p_ref date default null)
returns table(start_date date, end_date date)
language plpgsql
immutable
as $$
declare
  -- 영업일: 06:00 이전이면 전날. 스크래퍼 scraper/src/util.ts businessDayInTz 와 동일 규칙.
  v_ref date := coalesce(p_ref, ((now() at time zone 'Asia/Seoul') - interval '6 hours')::date);
begin
  if p_period = 'today' then
    start_date := v_ref;
    end_date   := v_ref;
  elsif p_period = 'week' then
    -- 주간: 수요일 시작 ~ 화요일 종료. 가장 최근 수요일(오늘 포함)로 앵커. (0009)
    start_date := v_ref - ((extract(isodow from v_ref)::int - 3 + 7) % 7);
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
