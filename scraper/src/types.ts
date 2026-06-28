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

/** 한 번의 수집 사이클 파싱 결과. */
export type ScrapeResult = {
  riders: RiderUpsert[]
  snapshots: SlaSnapshotUpsert[]
  hourly: HourlyStatUpsert[]
}

/** 적재 건수 요약(로깅용). */
export type UpsertCounts = {
  riders: number
  snapshots: number
  hourly: number
}
