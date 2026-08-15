-- 주간 매출(관리비) (2026-08-15) — 정산 '매출' 탭. 회사(협력사) 메인 수입.
-- 소스: grider 주정산서 xlsx '관리비' 시트. 세트 목표 달성 기반 관리수수료(기본+보너스).
-- 회사 단위 주 1행. additive·멱등.

create table if not exists public.weekly_revenue (
  week_start          date primary key,        -- 정산 주 시작(수요일)
  week_end            date not null,           -- 정산 주 끝(화요일)
  mgmt_fee_total      integer not null default 0,  -- 관리수수료 합계(VAT 별도) = 기본+보너스+기타
  base_fee            integer not null default 0,  -- 기본 관리비(슬롯 달성·수락률 기준)
  bonus_fee           integer not null default 0,  -- 보너스관리비(세트수·연속달성 주차 기준)
  etc_fee             integer not null default 0,  -- 기타
  payback_total       integer not null default 0,  -- 정산수수료 페이백(VAT 별도)
  set_count           integer,                 -- 신청 세트 수
  per_set_volume      integer,                 -- 세트당 발주량
  total_order_volume  integer,                 -- 전체 발주 물량(= 세트수 × 세트당)
  effective_volume    integer,                 -- 유효 처리 물량(= 발주 × 하위3슬롯 달성률)
  low3_achievement    numeric,                 -- 하위 3개 슬롯 평균 달성률(%)
  total_slots         integer,                 -- 전체 슬롯
  achieved_slots      integer,                 -- 달성 슬롯
  missed_slots        integer,                 -- 미달성 슬롯
  acceptance_rate     numeric,                 -- 수락률(%)
  source              text not null default 'grider_weekly_xlsx',
  captured_at         timestamptz not null default now()
);

alter table public.weekly_revenue enable row level security; -- 정책 없음 = service role 전용
