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
    }
    Enums: Empty
    CompositeTypes: Empty
  }
}
