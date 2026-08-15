-- 주간 세금계산서 내역(역발행) (2026-08-16) — 정산 '매출' 탭. 회사 매출(세금계산서 기준).
-- 소스: grider 주정산서 xlsx '갑지' 시트 "3.세금계산서 내역"(역발행 되는 라인별 금액).
-- 라인: 배달료·라이더수수료·관리비·정산수수료 페이백·합계. 각 공급가액/부가세액/공급대가. 회사 1주 1행.

create table if not exists public.weekly_tax_invoice (
  week_start        date primary key,
  week_end          date not null,
  delivery_supply   bigint not null default 0,  -- 배달료 공급가액
  delivery_vat      bigint not null default 0,
  delivery_total    bigint not null default 0,  -- 공급대가
  rider_fee_supply  bigint not null default 0,  -- 라이더수수료
  rider_fee_vat     bigint not null default 0,
  rider_fee_total   bigint not null default 0,
  mgmt_supply       bigint not null default 0,  -- 관리비
  mgmt_vat          bigint not null default 0,
  mgmt_total        bigint not null default 0,
  payback_supply    bigint not null default 0,  -- 정산수수료 페이백
  payback_vat       bigint not null default 0,
  payback_total     bigint not null default 0,
  sum_supply        bigint not null default 0,  -- 합계 공급가액(= 세금계산서 매출)
  sum_vat           bigint not null default 0,
  sum_total         bigint not null default 0,  -- 합계 공급대가(VAT 포함)
  source            text not null default 'grider_weekly_xlsx',
  captured_at       timestamptz not null default now()
);

alter table public.weekly_tax_invoice enable row level security; -- 정책 없음 = service role 전용
