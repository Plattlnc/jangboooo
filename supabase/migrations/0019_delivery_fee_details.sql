-- ───────────────────────────────────────────────────────────
-- jangboooo — 0019 배달건별 상세(배달처리비 내역)
-- 배민 '배달처리비 다운로드' 엑셀 '배달 내역 상세' 시트의 건별 원천 데이터.
-- 배달일지 일자 카드 터치 시 상세(픽업/전달시간·거리·배달처리비+할증 분해) 노출용.
-- 취소건(배달취소)도 포함(수입 0원이어도) — 상세에서 함께 표시.
-- RLS enable + 정책 없음 = service_role 전용. ADDITIVE — 프로덕션 무영향.
-- ───────────────────────────────────────────────────────────
create table if not exists public.delivery_fee_details (
  delivery_no    text    primary key,       -- 배달번호(고유)
  admin_rider_id text    not null,
  snapshot_date  date    not null,          -- 운행일
  status         text    not null,          -- 배달상태(전달완료/배달취소 등)
  pickup_at      text,                       -- 픽업완료(ISO local, HH:MM 표기용)
  delivered_at   text,                       -- 전달완료(ISO local)
  distance_m     integer,                    -- 거리(m). km = floor(m/100)/10
  base_fee       integer not null default 0, -- 기본단가
  weather_fee    integer not null default 0, -- 기상할증
  extra_fee      integer not null default 0, -- 추가할증
  peak_fee       integer not null default 0, -- 피크할증 등
  region_fee     integer not null default 0, -- 지역 할증
  bulk_fee       integer not null default 0, -- 대량 할증
  fee_krw        integer not null default 0, -- 배달처리비(할증 합계)
  rider_fault    boolean not null default false, -- 라이더귀책여부(Y=true)
  captured_at    timestamptz not null default now()
);

create index if not exists idx_delivery_fee_details_rider_date
  on public.delivery_fee_details (admin_rider_id, snapshot_date);

alter table public.delivery_fee_details enable row level security;

comment on table  public.delivery_fee_details is '배달건별 상세(배달처리비 내역) — 배달일지 일자 상세 노출용. 취소건 포함';
comment on column public.delivery_fee_details.distance_m is '거리(m). 표기 km = floor(m/100)/10 (예 2492→2.4KM)';
comment on column public.delivery_fee_details.fee_krw is '배달처리비 = 기본+기상+추가+피크+지역+대량 할증 합';
