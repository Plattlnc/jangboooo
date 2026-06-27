import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  RiderDailyRow,
  RiderHourlyRow,
  RiderSummaryRow,
  SlaPeriod,
} from '@/types/database'
import type { SlaDashboardResponse } from '@/types/api'

/**
 * SLA 데이터 접근 레이어 (서버 전용).
 * 커스텀 세션 인증 모델: 호출측이 검증된 세션에서 admin_rider_id 를 얻어 넘긴다.
 * service_role admin 클라이언트로 `*_for` RPC(0005, admin_rider_id 명시) 호출.
 * 보안: admin_rider_id 는 반드시 서명 세션(getRiderSession)에서만 유도할 것 — 외부 입력 금지.
 */

/** 기간 요약 1행 */
export async function getRiderSummaryFor(
  adminRiderId: string,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderSummaryRow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_rider_summary_for', {
    p_admin_rider_id: adminRiderId,
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data[0] // 집계 함수는 항상 1행
}

/** 기간 내 일별 시계열 */
export async function getRiderDailyFor(
  adminRiderId: string,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderDailyRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_rider_daily_for', {
    p_admin_rider_id: adminRiderId,
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data
}

/** 피크시간대 실적(0~23시) */
export async function getRiderHourlyFor(
  adminRiderId: string,
  period: SlaPeriod,
  ref?: string,
): Promise<RiderHourlyRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('get_rider_hourly_for', {
    p_admin_rider_id: adminRiderId,
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data
}

/** 라이더 표시 이름(대시보드 헤더 등). 세션의 admin_rider_id 로 조회. */
export async function getRiderName(adminRiderId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('riders')
    .select('name')
    .eq('admin_rider_id', adminRiderId)
    .maybeSingle()
  if (error) throw error
  return data?.name ?? null
}

/** 대시보드 한 화면(요약+일별+시간대) 동시 조회. */
export async function getDashboardFor(
  adminRiderId: string,
  period: SlaPeriod,
  ref?: string,
): Promise<SlaDashboardResponse> {
  const [summary, daily, hourly] = await Promise.all([
    getRiderSummaryFor(adminRiderId, period, ref),
    getRiderDailyFor(adminRiderId, period, ref),
    getRiderHourlyFor(adminRiderId, period, ref),
  ])
  return { period, summary, daily, hourly }
}
