-- ───────────────────────────────────────────────────────────
-- jangboooo — 0012 riders 실사용자 프로필 (내정보 등록)
-- 실 사용자 이름/연락처 + 운행 바이크 기종. 번호판은 0008 의 plate 재사용.
-- 용도: 내정보 화면 등록 → ROADING 사고접수 임베드 프리필(name/phone/plate/model).
-- 스크래퍼 upsert 컬럼셋과 무관(nullable, 사용자 수동 입력 전용).
-- 라이브 적용: 2026-07-27 (0008 plate 도 미적용 상태였어서 함께 적용됨)
-- ───────────────────────────────────────────────────────────
alter table public.riders add column if not exists real_name text;
alter table public.riders add column if not exists real_phone text;
alter table public.riders add column if not exists bike_model text;

comment on column public.riders.real_name is '실 사용자 이름 (내정보 등록, ROADING 사고접수 프리필용)';
comment on column public.riders.real_phone is '실 사용자 연락처 (내정보 등록, ROADING 사고접수 프리필용)';
comment on column public.riders.bike_model is '운행 바이크 기종 (내정보 등록, ROADING 내차량 표기용)';
