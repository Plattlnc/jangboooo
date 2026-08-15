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

/** 라이더 × 일자 시간제보험료 차감액(배달처리비 xlsx '보험' 시트에서 자동 추출). */
export type RiderInsurance = {
  admin_rider_id: string
  snapshot_date: string
  amount: number
}

/** grider 주정산서 '추가배달료' 시트 1건(rider_extra_payments upsert). */
export type RiderExtraPayment = {
  week_start: string
  week_end: string
  admin_rider_id: string
  rider_name: string | null
  amount_krw: number
  delivery_info: string
  reason: string
}

/** grider 주정산서 '을지' F열 시간제보험료(rider_weekly_insurance upsert). */
export type RiderWeeklyInsurance = {
  week_start: string
  week_end: string
  admin_rider_id: string
  rider_name: string | null
  amount_krw: number
}

/** grider 라이더 관리 계약상태(rider_contract_status upsert). */
export type RiderContractStatus = {
  admin_rider_id: string
  rider_name: string | null
  phone: string | null
  status: string
  is_terminated: boolean
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

/**
 * 실시간 근무(출근) 인원 요약 — delivery-status 의 라이더별 status 필드 집계.
 * status.code === 'READY'(운행 종료) 는 오프. 그 외 코드는 출근/근무중으로 간주.
 * DDL 없이 Supabase Storage(ops/working-status.json)에 라이브 스냅샷으로 적재.
 */
/** 현재 근무중(출근) 라이더 1명. */
export type WorkingRider = {
  admin_rider_id: string
  name: string | null
  status: string | null // status.desc (운행중/배차대기 등)
  completed: number // 오늘 완료건수(totalComplete)
}

export type WorkingStatusSummary = {
  snapshot_date: string
  center_id: string | null
  total: number // status 판별 가능한 라이더 수
  working: number // 운행 종료(READY)가 아닌 라이더 수 = 현재 출근 인원
  by_status: Record<string, number> // desc → count (진단/향후 세분화용)
  riders: WorkingRider[] // 현재 근무중 라이더 목록(이름/ID/상태)
}

/** 한 번의 수집 사이클 파싱 결과. */
export type ScrapeResult = {
  riders: RiderUpsert[]
  snapshots: SlaSnapshotUpsert[]
  hourly: HourlyStatUpsert[]
  /** 센터 피크별 실시간 current(배민 합산). centerId 있을 때만. */
  centerPeakCurrents?: CenterCurrentUpsert[]
  /** 실시간 근무 인원 요약(라이브 수집에서만 세팅). */
  workingStatus?: WorkingStatusSummary
}

/** 적재 건수 요약(로깅용). */
export type UpsertCounts = {
  riders: number
  snapshots: number
  hourly: number
  centerCurrents?: number
  working?: number
}
