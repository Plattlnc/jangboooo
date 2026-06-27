-- ───────────────────────────────────────────────────────────
-- jangboooo — 0004 배민 delivery-status 매핑 보강
-- 소스: 배민 deliverycenter /v4/management/delivery-status (docs/api/baemin-source.md)
-- 작성: backend (Task #17)
--
-- 매핑/산식 (매퍼 src/lib/baemin/mapper.ts 가 계산해 적재):
--   completed         = deliveryAcceptanceCount.totalComplete
--   rejected          = .totalReject
--   dispatch_canceled = .totalCancel       (배차취소)
--   delivery_canceled = .totalRiderFault   (배달취소·라이더귀책)
--   assigned          = totalComplete + totalReject + totalCancel + totalRiderFault  (배차 제안 총량)
--   acceptance_rate   = (assigned - totalReject) / assigned * 100   (수락률 = 수락/제안, %)
--   sla_score         = totalComplete / assigned * 100  (★잠정: 완료율 기반)
--                       └ 배민 이 API엔 SLA 점수 없음. 달성현황(beta) 실점수 확보 시 교체. null 허용.
--   hourlyCompleted[] → rider_hourly_stats(hour, completed)
-- 기간(오늘/주/월) 집계는 기존 RPC(get_rider_summary 등)가 위 컬럼으로 그대로 처리 — 변경 없음.
-- ───────────────────────────────────────────────────────────

-- 피크시간대 4버킷 (배민 deliveryPeakTimeCount). 시간(0~23)은 rider_hourly_stats 가 별도 보존.
alter table public.sla_snapshots add column if not exists peak_morning   integer not null default 0; -- 아침·점심
alter table public.sla_snapshots add column if not exists peak_afternoon integer not null default 0; -- 오후(논피크)
alter table public.sla_snapshots add column if not exists peak_evening   integer not null default 0; -- 저녁
alter table public.sla_snapshots add column if not exists peak_midnight  integer not null default 0; -- 심야

-- 푸드/비마트/배민스토어 세부(complete/reject/cancel/riderFault 카테고리별) 원본 보존.
-- 핫패스 집계는 위 합계 컬럼이 담당 — 세부는 향후 카테고리 뷰 대비 jsonb 로만 보관(스키마 비대화 회피).
-- 형태: {"food":{"complete":0,"reject":0,"cancel":0,"riderFault":0},"bmart":{...},"store":{...}}
alter table public.sla_snapshots add column if not exists breakdown jsonb;

comment on column public.sla_snapshots.assigned is '배차 제안 총량 = complete+reject+cancel+riderFault';
comment on column public.sla_snapshots.acceptance_rate is '수락률(%) = (assigned-reject)/assigned*100';
comment on column public.sla_snapshots.sla_score is '잠정 SLA = complete/assigned*100. 배민 실점수(달성현황 beta) 확보 시 교체. null 허용';
comment on column public.sla_snapshots.breakdown is '푸드/비마트/스토어 카테고리별 세부(jsonb). 합계는 별도 컬럼';
