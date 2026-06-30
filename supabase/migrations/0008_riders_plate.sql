-- ───────────────────────────────────────────────────────────
-- jangboooo — 0008 riders.plate (등록 차량번호)
-- ROADING 임베드 step2 '내차량' 표기용. 라이더의 등록 차량번호.
-- 소스: 현재 배민 스크래퍼는 차량번호 미제공 → 수동/추후 소스로 채움(nullable).
-- ───────────────────────────────────────────────────────────
alter table public.riders add column if not exists plate text;
comment on column public.riders.plate is '등록 차량번호(ROADING 내차량 표기). 스크래퍼 소스 없음 — 수동/추후.';
