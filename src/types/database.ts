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

// ── Supabase 클라이언트 제네릭용 Database 타입 ─────────────────
type RpcArgs = { p_period: SlaPeriod; p_ref?: string | null }
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
      rider_account: {
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
    }
    Views: Empty
    Functions: {
      get_rider_summary: { Args: RpcArgs; Returns: RiderSummaryRow[] }
      get_rider_daily: { Args: RpcArgs; Returns: RiderDailyRow[] }
      get_rider_hourly: { Args: RpcArgs; Returns: RiderHourlyRow[] }
      bind_rider_by_phone: {
        Args: { p_user_id: string; p_phone: string; p_verify_provider?: string | null }
        Returns: RiderAccountRow
      }
      current_admin_rider_id: { Args: Empty; Returns: string | null }
      normalize_phone: { Args: { p_phone: string }; Returns: string | null }
    }
    Enums: Empty
    CompositeTypes: Empty
  }
}
