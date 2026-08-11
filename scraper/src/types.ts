/**
 * 스크래퍼 → Supabase 적재 페이로드 타입.
 * supabase/migrations/0001_core_schema.sql 의 컬럼과 1:1 대응.
 * (생성/기본값 컬럼 id·phone_norm·created_at·updated_at 은 제외.)
 *
 * 멱등 키(upsert onConflict):
 *   riders             → admin_rider_id (PK)
 *   sla_snapshots      → (admin_rider_id, snapshot_date)
 *   rider_hourly_stats → (admin_rider_id, snapshot_date, hour)
 */

/** riders upsert: 관리시스템 라이더 명단. */
export type RiderUpsert = {
  admin_rider_id: string
  name?: string | null
  phone?: string | null
  region?: string | null
  is_active?: boolean
  /** 소속 협력사(센터) ID — delivery-status 의 center-id 헤더값(예 DP2504250236). */
  center_id?: string | null
}

/** center_peak_goals upsert: 센터 × 영업일 × 피크 공동목표. */
export type CenterGoalUpsert = {
  center_id: string
  center_name?: string | null
  snapshot_date: string // YYYY-MM-DD
  peak_key: 'ml' | 'pl' | 'd' | 'pd'
  current: number | null
  goal: number | null
  pct: number | null
  captured_at?: string
}

/** 배민 실시간 집계로 산출한 센터 피크별 current(누적 완료). goal/pct 는 upsert 시 병합/산출. */
export type CenterCurrentUpsert = {
  center_id: string
  snapshot_date: string // YYYY-MM-DD
  peak_key: 'ml' | 'pl' | 'd' | 'pd'
  current: number
}

/** sla_snapshots.breakdown jsonb (푸드/비마트/스토어 세부). */
export type SlaCategoryCounts = {
  complete: number
  reject: number
  cancel: number
  riderFault: number
}
export type SlaCategoryBreakdown = {
  food: SlaCategoryCounts
  bmart: SlaCategoryCounts
  store: SlaCategoryCounts
}

/** sla_snapshots upsert: 라이더 × 영업일 누적치. */
export type SlaSnapshotUpsert = {
  admin_rider_id: string
  snapshot_date: string // YYYY-MM-DD (SCRAPE_TIMEZONE 기준)
  captured_at?: string // ISO8601, 미지정 시 적재 시점 사용
  sla_score?: number | null
  completed?: number
  rejected?: number
  dispatch_canceled?: number
  delivery_canceled?: number
  assigned?: number
  acceptance_rate?: number | null
  // 배민 보강(0004): 피크 4버킷 + 카테고리 세부
  peak_morning?: number
  peak_afternoon?: number
  peak_evening?: number
  peak_midnight?: number
  breakdown?: SlaCategoryBreakdown | null
}

/** rider_hourly_stats upsert: 라이더 × 영업일 × 시간(0~23) 완료건. */
export type HourlyStatUpsert = {
  admin_rider_id: string
  snapshot_date: string
  hour: number // 0~23
  completed: number
  captured_at?: string
}

/** rider_daily_fees upsert: 라이더 × 영업일 배달처리비(세전 수입) + 본사미션. */
export type RiderDailyFee = {
  admin_rider_id: string
  snapshot_date: string
  fee_krw: number // 배달처리비 합(전달완료 + 무귀책 배달취소), 세전
  mission_krw: number // 본사 미션 지급 금액 합
  completed_cnt: number // 전달완료 건수(교차검증용)
  source: string
  captured_at?: string
}

/** delivery_fee_details upsert: 배달건별 상세(전 건 — 취소 포함). */
export type DeliveryFeeDetail = {
  delivery_no: string
  admin_rider_id: string
  snapshot_date: string
  status: string
  store_name: string | null
  pickup_at: string | null
  delivered_at: string | null
  distance_m: number | null
  base_fee: number
  weather_fee: number
  extra_fee: number
  peak_fee: number
  region_fee: number
  bulk_fee: number
  fee_krw: number
  rider_fault: boolean
  captured_at?: string
}

/** 한 번의 수집 사이클 파싱 결과. */
export type ScrapeResult = {
  riders: RiderUpsert[]
  snapshots: SlaSnapshotUpsert[]
  hourly: HourlyStatUpsert[]
  /** 센터 피크별 실시간 current(배민 합산). centerId 있을 때만. */
  centerPeakCurrents?: CenterCurrentUpsert[]
}

/** 적재 건수 요약(로깅용). */
export type UpsertCounts = {
  riders: number
  snapshots: number
  hourly: number
  centerCurrents?: number
}
