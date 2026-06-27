/**
 * Supabase 생성 타입 placeholder.
 * backend-engineer 가 스키마 확정 후 `supabase gen types typescript` 결과로 교체한다.
 * 그 전까지 임시 도메인 타입만 둔다.
 */

export type SlaPeriod = 'today' | 'week' | 'month'

/** 관리시스템 라이더 고유 ID 로 식별되는 라이더 */
export interface Rider {
  id: string
  admin_rider_id: string
  name: string | null
  phone: string | null
  created_at: string
}

/** 라이더별/시점별 SLA 스냅샷 (1분 스크래핑 누적) */
export interface SlaSnapshot {
  id: string
  admin_rider_id: string
  captured_at: string
  sla_score: number | null
  completed: number
  rejected: number
  dispatch_canceled: number
  delivery_canceled: number
  acceptance_rate: number | null
}
