-- ───────────────────────────────────────────────────────────
-- jangboooo — 0013 riders 이용 형태 + 보험 기간 (내정보 등록)
-- 이용 형태: 렌탈/리스. 보험: 시작일 + 기간(일수) → 만료일은 표시 시 계산.
-- 활동 권역(region)은 스크래퍼가 센터 단위로 스탬프(baemin-map REGION_BY_CENTER).
-- ───────────────────────────────────────────────────────────
alter table public.riders add column if not exists usage_type text
  check (usage_type in ('렌탈', '리스'));
alter table public.riders add column if not exists insurance_start date;
alter table public.riders add column if not exists insurance_days integer
  check (insurance_days > 0);

comment on column public.riders.usage_type is '차량 이용 형태 (렌탈/리스) — 내정보 등록';
comment on column public.riders.insurance_start is '보험 시작일 — 내정보 등록';
comment on column public.riders.insurance_days is '보험 기간(일수) — 만료일 = insurance_start + insurance_days';
