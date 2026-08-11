-- ───────────────────────────────────────────────────────────
-- jangboooo — 0020 배달건별 상세에 가맹점명(픽업지·가게 이름) 추가
-- 배민 '배달처리비 다운로드' 엑셀 '배달 내역 상세' 시트의 '가맹점명' 컬럼 원천.
-- 배달일지 일자 상세 카드에서 픽업지(가게) 이름 노출용.
-- ADDITIVE · nullable — 기존 행은 NULL(백필 전까지), 프로덕션 무영향.
-- ───────────────────────────────────────────────────────────
alter table public.delivery_fee_details
  add column if not exists store_name text;

comment on column public.delivery_fee_details.store_name is '가맹점명(픽업지·가게 이름) — 배민 배달 내역 상세 시트 원천. 없으면 NULL';
