-- 주간 시간제보험료 (2026-08-15) — 차감 정산 자동값.
-- 소스: 바로고 주차별 정산내역서 xlsx '을지' 시트 F열(시간제보험료). 배민 배달처리비 파일엔
-- 보험 시트가 없고(2시트뿐), 배민 보험료 메뉴는 이메일 발송 방식이라 즉시 스크래핑 불가 —
-- 주간 정산서가 유일한 자동 소스. 주 단위(수~화) 라이더별 1행. additive·멱등.

create table if not exists public.rider_weekly_insurance (
  id             bigint generated always as identity primary key,
  week_start     date not null,             -- 정산 주 시작(수요일)
  week_end       date not null,             -- 정산 주 끝(화요일)
  admin_rider_id text not null,             -- 을지 'User ID'
  rider_name     text,
  amount_krw     integer not null,          -- 시간제보험료 F열
  source         text not null default 'barogo_weekly_xlsx',
  captured_at    timestamptz not null default now(),
  constraint rider_weekly_insurance_uniq unique (week_start, admin_rider_id)
);

create index if not exists rider_weekly_insurance_week_idx
  on public.rider_weekly_insurance (week_start, admin_rider_id);

alter table public.rider_weekly_insurance enable row level security; -- 정책 없음 = service role 전용
