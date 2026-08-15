-- 추가 지급(소급 보정) 내역 (2026-08-15) — 정산 > 추가 지급 메뉴.
-- 소스: 바로고 주차별 정산내역서 xlsx '추가배달료' 시트(기상할증 보정 등 사후 소급 지급).
-- 배민 배달처리비 daily 파일에는 미반영(8/3 재다운로드 diff 0건으로 실측 확인) —
-- 주간 정산서에만 존재하므로 주 단위 적재. additive·멱등.

create table if not exists public.rider_extra_payments (
  id             bigint generated always as identity primary key,
  week_start     date not null,             -- 정산 주 시작(수요일)
  week_end       date not null,             -- 정산 주 끝(화요일)
  admin_rider_id text not null,             -- 파일 '라이더ID' = User ID
  rider_name     text,
  amount_krw     integer not null,
  delivery_info  text not null default '',  -- 예: 20260803_7817LRHQ (대상 배달일_배달번호)
  reason         text not null default '',  -- 예: 20260803-20260805_기상할증 보정
  source         text not null default 'barogo_weekly_xlsx',
  captured_at    timestamptz not null default now(),
  constraint rider_extra_payments_uniq unique (week_start, admin_rider_id, delivery_info, reason)
);

create index if not exists rider_extra_payments_week_idx
  on public.rider_extra_payments (week_start, admin_rider_id);

alter table public.rider_extra_payments enable row level security; -- 정책 없음 = service role 전용
