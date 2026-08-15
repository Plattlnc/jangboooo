/**
 * Supabase 스키마 타입 (수기 관리).
 * 마이그레이션 0001~0003 과 일치. 실DB 연결 후
 * `supabase gen types typescript` 결과로 교체 가능(형태 동일).
 *
 * 도메인 식별키: admin_rider_id (관리시스템 라이더 고유 ID)
 *
 * 주의: Row/RPC 타입은 반드시 `type`(인터페이스 아님)으로 둔다.
 *       interface 는 `Record<string, unknown>` 에 할당되지 않아 Supabase 클라이언트
 *       제네릭(GenericSchema)을 깨뜨린다(→ rpc/from 타입이 never 로 붕괴).
 */

export type SlaPeriod = 'today' | 'week' | 'month'

// ── 행(Row) 타입 ─────────────────────────────────────────────
export type RiderRow = {
  admin_rider_id: string
  name: string | null
  phone: string | null
  phone_norm: string | null
  region: string | null
  is_active: boolean
  /** 소속 협력사(센터) ID (0006). 공동목표 RPC 의 라이더→센터 해석에 사용. */
  center_id: string | null
  /** 등록 차량번호 (0008). ROADING 내차량 표기 — 스크래퍼 소스 없음, 내정보에서 수동 등록. */
  plate: string | null
  /** 실 사용자 이름 (0012, 내정보 등록 — ROADING 사고접수 프리필). */
  real_name: string | null
  /** 실 사용자 연락처 (0012, 내정보 등록 — ROADING 사고접수 프리필). */
  real_phone: string | null
  /** 운행 바이크 기종 (0012, 내정보 등록 — ROADING 내차량 표기). */
  bike_model: string | null
  /** 차량 이용 형태 (0013, 내정보 등록): '렌탈' | '리스'. */
  usage_type: string | null
  /** 보험 시작일 (0013, 내정보 등록) — 'YYYY-MM-DD'. */
  insurance_start: string | null
  /** 보험 기간 일수 (0013, 내정보 등록) — 만료일 = start + days. */
  insurance_days: number | null
  /** 프로필 사진 경로 (0015, 내정보 등록) — avatars 버킷 내 `<uid>/avatar-<ts>.<ext>`. */
  avatar_path: string | null
  created_at: string
  updated_at: string
}

/** 제휴 정비소 (0014) — 관리자 등록, 라이더 내주변정비소 노출. */
export type RepairShopRow = {
  id: string
  name: string
  phone: string | null
  address: string | null
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RiderAccountRow = {
  user_id: string
  admin_rider_id: string
  verified_phone: string
  verify_provider: string | null
  verified_at: string
  created_at: string
}

// 0018: 라이더 일별 배달처리비(세전 수입) — 배민 배달처리비 엑셀 적재분.
// 0024: 추가 지급(소급 보정) — 바로고 주차별 정산내역서 '추가배달료' 시트 적재분.
export type RiderExtraPaymentRow = {
  id: number
  week_start: string
  week_end: string
  admin_rider_id: string
  rider_name: string | null
  amount_krw: number
  delivery_info: string
  reason: string
  source: string
  captured_at: string
}

export type RiderDailyFeeRow = {
  admin_rider_id: string
  snapshot_date: string
  fee_krw: number
  mission_krw: number
  completed_cnt: number
  source: string | null
  captured_at: string
}

// 0019: 배달건별 상세(배달처리비 내역) — 배달일지 일자 상세 노출용.
export type DeliveryFeeDetailRow = {
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
  captured_at: string
}

export type NoticeRow = {
  id: string
  title: string
  body: string // sanitized HTML
  excerpt: string | null
  is_published: boolean
  is_pinned: boolean
  is_important: boolean
  is_featured: boolean
  /** 공유 링크(/n/[id]) 로그인 없이 열람 허용 (0022) */
  is_public: boolean
  /** 누적 고유 조회수 — notice_views 기반, record_notice_view 가 유지 (0022) */
  view_count: number
  published_at: string | null
  created_at: string
  updated_at: string
}

export type SlaSnapshotRow = {
  id: number
  admin_rider_id: string
  snapshot_date: string // YYYY-MM-DD
  captured_at: string
  sla_score: number | null
  completed: number
  rejected: number
  dispatch_canceled: number
  delivery_canceled: number
  assigned: number
  acceptance_rate: number | null
  // 배민 보강(0004): 피크 4버킷 + 카테고리 세부
  peak_morning: number
  peak_afternoon: number
  peak_evening: number
  peak_midnight: number
  breakdown: SlaCategoryBreakdown | null
}

/** sla_snapshots.breakdown jsonb 형태 (푸드/비마트/스토어 세부) */
export type SlaCategoryBreakdown = {
  food: SlaCategoryCounts
  bmart: SlaCategoryCounts
  store: SlaCategoryCounts
}
export type SlaCategoryCounts = {
  complete: number
  reject: number
  cancel: number
  riderFault: number
}

export type RiderHourlyStatsRow = {
  id: number
  admin_rider_id: string
  snapshot_date: string
  hour: number
  completed: number
  captured_at: string
}

/** @deprecated placeholder 호환용 별칭 — 신규 코드는 RiderRow 사용 */
export type Rider = RiderRow
/** @deprecated placeholder 호환용 별칭 — 신규 코드는 SlaSnapshotRow 사용 */
export type SlaSnapshot = SlaSnapshotRow

// ── RPC 반환 타입 ────────────────────────────────────────────
export type RiderSummaryRow = {
  period: SlaPeriod
  start_date: string
  end_date: string
  admin_rider_id: string | null
  sla_score: number | null
  completed: number
  rejected: number
  dispatch_canceled: number
  delivery_canceled: number
  assigned: number
  acceptance_rate: number | null
  active_days: number
  last_captured_at: string | null
}

export type RiderDailyRow = {
  snapshot_date: string
  sla_score: number | null
  completed: number
  rejected: number
  dispatch_canceled: number
  delivery_canceled: number
  assigned: number
  acceptance_rate: number | null
}

export type RiderHourlyRow = {
  hour: number
  completed: number
}

/** 앱 사용 현황 일별 행 (0017) — KST 달력일 기준 방문수·활성 라이더수. */
export type AppUsageRow = {
  day: string // YYYY-MM-DD
  visits: number
  riders: number
}

/** 배달 랭킹 행 (0016) — 기간 완료건 합 순위. 동률=공동 순위(rank). */
export type RiderRankingRow = {
  rnk: number
  admin_rider_id: string
  rider_name: string
  avatar_path: string | null
  completed: number
}

/** 기간 피크 4버킷 합계 — 배민 원본(deliveryPeakTimeCount → sla_snapshots.peak_*) 합산값. */
export type RiderPeakTotals = {
  morning: number
  afternoon: number
  evening: number
  midnight: number
}

/** center_peak_goals 행 (0006). */
export type CenterPeakGoalRow = {
  id: number
  center_id: string
  center_name: string | null
  snapshot_date: string
  peak_key: 'ml' | 'pl' | 'd' | 'pd'
  current: number | null
  goal: number | null
  pct: number | null
  captured_at: string
}

/** get_center_goals_for RPC 반환 행 (0007). 항상 4행(ml→pl→d→pd 순서). */
export type CenterGoalRow = {
  peak_key: 'ml' | 'pl' | 'd' | 'pd'
  peak_order: number
  /** 디자인 확정 라벨(아침점심/오후논피크/저녁피크/심야논피크). frontend 가 덮어쓸 수 있음. */
  label: string
  current: number | null
  goal: number | null
  /** 소스 표기 퍼센트(0~100, 100 상한). 데이터 없으면 null → UI '—'. */
  pct: number | null
  snapshot_date: string | null
  center_id: string | null
}

// ── Supabase 클라이언트 제네릭용 Database 타입 ─────────────────
type RpcArgs = { p_period: SlaPeriod; p_ref?: string | null }
type RpcForArgs = { p_admin_rider_id: string; p_period: SlaPeriod; p_ref?: string | null }
type Empty = Record<never, never>

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' }
  public: {
    Tables: {
      riders: {
        Row: RiderRow
        Insert: { admin_rider_id: string } & Partial<Omit<RiderRow, 'admin_rider_id' | 'phone_norm'>>
        Update: Partial<Omit<RiderRow, 'phone_norm'>>
        Relationships: []
      }
      rider_accounts: {
        Row: RiderAccountRow
        Insert: Pick<RiderAccountRow, 'user_id' | 'admin_rider_id' | 'verified_phone'> &
          Partial<Omit<RiderAccountRow, 'user_id' | 'admin_rider_id' | 'verified_phone'>>
        Update: Partial<RiderAccountRow>
        Relationships: []
      }
      repair_shops: {
        Row: RepairShopRow
        Insert: Pick<RepairShopRow, 'name'> & Partial<Omit<RepairShopRow, 'name'>>
        Update: Partial<Omit<RepairShopRow, 'id'>>
        Relationships: []
      }
      sla_snapshots: {
        Row: SlaSnapshotRow
        Insert: Pick<SlaSnapshotRow, 'admin_rider_id' | 'snapshot_date'> &
          Partial<Omit<SlaSnapshotRow, 'id' | 'admin_rider_id' | 'snapshot_date'>>
        Update: Partial<Omit<SlaSnapshotRow, 'id'>>
        Relationships: []
      }
      rider_hourly_stats: {
        Row: RiderHourlyStatsRow
        Insert: Pick<RiderHourlyStatsRow, 'admin_rider_id' | 'snapshot_date' | 'hour'> &
          Partial<Omit<RiderHourlyStatsRow, 'id' | 'admin_rider_id' | 'snapshot_date' | 'hour'>>
        Update: Partial<Omit<RiderHourlyStatsRow, 'id'>>
        Relationships: []
      }
      center_peak_goals: {
        Row: CenterPeakGoalRow
        Insert: Pick<CenterPeakGoalRow, 'center_id' | 'snapshot_date' | 'peak_key'> &
          Partial<Omit<CenterPeakGoalRow, 'id' | 'center_id' | 'snapshot_date' | 'peak_key'>>
        Update: Partial<Omit<CenterPeakGoalRow, 'id'>>
        Relationships: []
      }
      rider_extra_payments: {
        Row: RiderExtraPaymentRow
        Insert: Pick<RiderExtraPaymentRow, 'week_start' | 'week_end' | 'admin_rider_id' | 'amount_krw'> &
          Partial<Omit<RiderExtraPaymentRow, 'week_start' | 'week_end' | 'admin_rider_id' | 'amount_krw' | 'id'>>
        Update: Partial<Omit<RiderExtraPaymentRow, 'id'>>
        Relationships: []
      }
      rider_daily_fees: {
        Row: RiderDailyFeeRow
        Insert: Pick<RiderDailyFeeRow, 'admin_rider_id' | 'snapshot_date'> &
          Partial<Omit<RiderDailyFeeRow, 'admin_rider_id' | 'snapshot_date'>>
        Update: Partial<RiderDailyFeeRow>
        Relationships: []
      }
      delivery_fee_details: {
        Row: DeliveryFeeDetailRow
        Insert: Pick<DeliveryFeeDetailRow, 'delivery_no' | 'admin_rider_id' | 'snapshot_date' | 'status'> &
          Partial<Omit<DeliveryFeeDetailRow, 'delivery_no' | 'admin_rider_id' | 'snapshot_date' | 'status'>>
        Update: Partial<DeliveryFeeDetailRow>
        Relationships: []
      }
      notices: {
        Row: NoticeRow
        Insert: Pick<NoticeRow, 'title'> & Partial<Omit<NoticeRow, 'title'>>
        Update: Partial<NoticeRow>
        Relationships: []
      }
    }
    Views: Empty
    Functions: {
      // auth.uid 기반(레거시 — 카카오 인증 시절). 신규 경로는 *_for 사용.
      get_rider_summary: { Args: RpcArgs; Returns: RiderSummaryRow[] }
      get_rider_daily: { Args: RpcArgs; Returns: RiderDailyRow[] }
      get_rider_hourly: { Args: RpcArgs; Returns: RiderHourlyRow[] }
      // 커스텀 세션 인증(0005): admin_rider_id 명시, service_role 전용.
      get_rider_summary_for: { Args: RpcForArgs; Returns: RiderSummaryRow[] }
      get_rider_daily_for: { Args: RpcForArgs; Returns: RiderDailyRow[] }
      get_rider_hourly_for: { Args: RpcForArgs; Returns: RiderHourlyRow[] }
      // 공동목표(달성현황 beta, 0007): 라이더 센터의 4피크. service_role 전용.
      get_center_goals_for: {
        Args: { p_admin_rider_id: string; p_ref?: string | null }
        Returns: CenterGoalRow[]
      }
      current_admin_rider_id: { Args: Empty; Returns: string | null }
      normalize_phone: { Args: { p_phone: string }; Returns: string | null }
      // 기간 경계(영업일 -6h 앵커, 주=수요일 시작). 관리자 집계가 직접 호출(0010).
      sla_period_range: {
        Args: { p_period: SlaPeriod; p_ref?: string | null }
        Returns: { start_date: string; end_date: string }[]
      }
      // 배달 랭킹(0016): 기간 완료건 합 순위, 활동자(>0)만. service_role 전용.
      get_rider_ranking: { Args: RpcArgs; Returns: RiderRankingRow[] }
      // 앱 사용 현황(0017): KST 일별 방문·활성 라이더. service_role 전용.
      get_app_usage: { Args: { p_days?: number }; Returns: AppUsageRow[] }
      // 공지 고유 조회 기록(0022): 뷰어당 1회 dedupe + view_count 유지. service_role 전용.
      record_notice_view: {
        Args: { p_notice_id: string; p_viewer_id: string }
        Returns: number | null
      }
    }
    Enums: Empty
    CompositeTypes: Empty
  }
}
