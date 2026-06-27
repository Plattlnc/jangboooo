import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  RiderDailyRow,
  RiderHourlyRow,
  RiderSummaryRow,
  SlaPeriod,
} from '@/types/database'
import type { BindingStatus, SlaDashboardResponse } from '@/types/api'

export type Client = SupabaseClient<Database>

/**
 * 데이터 접근 레이어 — RLS 가 적용되는 사용자 컨텍스트 클라이언트(server/client)를 주입받는다.
 * 모든 RPC 는 본인 데이터만 반환(0002 RLS + current_admin_rider_id).
 */

/** 기간 요약 1행 */
export async function getRiderSummary(
  supabase: Client,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderSummaryRow> {
  const { data, error } = await supabase.rpc('get_rider_summary', {
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  // 집계 함수는 항상 1행 반환
  return data[0]
}

/** 기간 내 일별 시계열 */
export async function getRiderDaily(
  supabase: Client,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderDailyRow[]> {
  const { data, error } = await supabase.rpc('get_rider_daily', {
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data
}

/** 피크시간대 실적(0~23시) */
export async function getRiderHourly(
  supabase: Client,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderHourlyRow[]> {
  const { data, error } = await supabase.rpc('get_rider_hourly', {
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data
}

/** 대시보드 한 화면 데이터(요약+일별+시간대) 동시 조회 */
export async function getDashboard(
  supabase: Client,
  period: SlaPeriod,
  ref?: string,
): Promise<SlaDashboardResponse> {
  const [summary, daily, hourly] = await Promise.all([
    getRiderSummary(supabase, period, ref),
    getRiderDaily(supabase, period, ref),
    getRiderHourly(supabase, period, ref),
  ])
  return { period, summary, daily, hourly }
}

/** 현재 로그인 사용자의 바인딩 상태(라이더 연결 여부) */
export async function getBindingStatus(supabase: Client): Promise<BindingStatus> {
  const { data: account, error } = await supabase
    .from('rider_account')
    .select('admin_rider_id')
    .maybeSingle()
  if (error) throw error
  if (!account) return { bound: false, adminRiderId: null, riderName: null }

  // RLS 로 본인 라이더 행만 보이므로 단순 조회(임베드 미사용)
  const { data: rider, error: riderErr } = await supabase
    .from('riders')
    .select('name')
    .eq('admin_rider_id', account.admin_rider_id)
    .maybeSingle()
  if (riderErr) throw riderErr

  return { bound: true, adminRiderId: account.admin_rider_id, riderName: rider?.name ?? null }
}
