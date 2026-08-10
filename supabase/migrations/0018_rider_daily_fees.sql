-- ───────────────────────────────────────────────────────────
-- jangboooo — 0018 라이더 일별 배달처리비(수입, 세전)
-- 배민 deliverycenter '배달처리비 다운로드' 엑셀(암호=계정ID)에서 적재.
-- 라이더별·영업일별 배달처리비 합(전달완료 + 라이더무귀책 배달취소) + 본사미션 금액.
-- 배달일지(/diary)에서 일자별 수입(세전)으로 노출.
-- RLS enable + 정책 없음 = service_role 전용(서버 컴포넌트/적재 스크립트).
-- ADDITIVE — 기존 기능/프로덕션 무영향(신규 테이블).
-- ───────────────────────────────────────────────────────────
create table if not exists public.rider_daily_fees (
  admin_rider_id text    not null,
  snapshot_date  date    not null,
  fee_krw        integer not null default 0,   -- 배달처리비 합(전달완료 + 무귀책 배달취소), 세전
  mission_krw    integer not null default 0,   -- 본사 미션 지급 금액 합(당일)
  completed_cnt  integer not null default 0,   -- 전달완료 건수(교차검증용)
  source         text,                          -- 적재 출처(파일명/기간)
  captured_at    timestamptz not null default now(),
  primary key (admin_rider_id, snapshot_date)
);

alter table public.rider_daily_fees enable row level security;

comment on table  public.rider_daily_fees is '라이더 일별 배달처리비(세전 수입) — 배민 배달처리비 엑셀 적재';
comment on column public.rider_daily_fees.fee_krw is '배달처리비 합(전달완료 + 라이더무귀책 배달취소), 세전';
comment on column public.rider_daily_fees.mission_krw is '본사 미션 지급 금액 합(당일)';
comment on column public.rider_daily_fees.completed_cnt is '전달완료 건수(sla_snapshots.completed 교차검증용)';
