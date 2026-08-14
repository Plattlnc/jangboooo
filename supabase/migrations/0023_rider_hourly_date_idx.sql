-- rider_hourly_stats 날짜 선행 인덱스 (2026-08-14) — 정산·admin 쿼리 최적화.
-- 정산(자사프로모션 promo.ts / 월정산 monthly.ts)·admin(admin-queries.ts) 시간대 쿼리는
-- snapshot_date 범위 조건 선행(전 라이더 대상)인데, 기존 인덱스는 (admin_rider_id, snapshot_date)
-- 선행이라 이 패턴에선 인덱스를 못 타고 순차 스캔(최대 테이블, 월 3.6만 행 증가).
-- (completed, hour 포함 → 핫쿼리 커버링) additive — 기존 데이터/쿼리 무영향, 멱등.
create index if not exists rider_hourly_date_idx
  on public.rider_hourly_stats (snapshot_date, admin_rider_id, hour, completed);
