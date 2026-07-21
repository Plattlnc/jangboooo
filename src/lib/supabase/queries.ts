import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  RiderDailyRow,
  RiderHourlyRow,
  RiderPeakTotals,
  RiderSummaryRow,
  SlaCategoryCounts,
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

/**
 * 기간 피크 4버킷 합계 — 배민 원본 버킷(deliveryPeakTimeCount → sla_snapshots.peak_*)을
 * 그대로 합산. 시간(hour) 경계 추정 없이 소스 수치와 정확히 일치한다.
 * 기간 경계는 요약 RPC 가 반환한 start_date/end_date 를 그대로 받아 일관성 유지.
 */
export async function getRiderPeaksFor(
  adminRiderId: string,
  startDate: string,
  endDate: string,
): Promise<RiderPeakTotals> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sla_snapshots')
    .select('peak_morning, peak_afternoon, peak_evening, peak_midnight')
    .eq('admin_rider_id', adminRiderId)
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
  if (error) throw error
  return (data ?? []).reduce<RiderPeakTotals>(
    (acc, row) => ({
      morning: acc.morning + row.peak_morning,
      afternoon: acc.afternoon + row.peak_afternoon,
      evening: acc.evening + row.peak_evening,
      midnight: acc.midnight + row.peak_midnight,
    }),
    { morning: 0, afternoon: 0, evening: 0, midnight: 0 },
  )
}

/** 기간 카테고리 세부 합계 — B마트/스토어 각각. breakdown 보유 행이 없으면 null. */
export interface RiderCategorySplit {
  bmart: SlaCategoryCounts
  store: SlaCategoryCounts
}

/**
 * 기간 B마트·스토어 세부 합계 — sla_snapshots.breakdown(0004, 배민 원본 카테고리) 합산.
 * 요약 합계(completed 등)는 푸드+B마트+스토어 전체이므로, 화면의 "일반" 표시는
 * (합계 − bmart − store) 로 파생한다(= 순수 푸드). breakdown 보유 행이 하나도 없으면
 * null(분리 표시 불가 신호).
 */
export async function getRiderCategoriesFor(
  adminRiderId: string,
  startDate: string,
  endDate: string,
): Promise<RiderCategorySplit | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sla_snapshots')
    .select('breakdown')
    .eq('admin_rider_id', adminRiderId)
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
  if (error) throw error
  const rows = (data ?? []).flatMap((row) => (row.breakdown ? [row.breakdown] : []))
  if (rows.length === 0) return null
  const addCat = (acc: SlaCategoryCounts, c: SlaCategoryCounts | undefined): SlaCategoryCounts => ({
    complete: acc.complete + (c?.complete ?? 0),
    reject: acc.reject + (c?.reject ?? 0),
    cancel: acc.cancel + (c?.cancel ?? 0),
    riderFault: acc.riderFault + (c?.riderFault ?? 0),
  })
  const EMPTY: SlaCategoryCounts = { complete: 0, reject: 0, cancel: 0, riderFault: 0 }
  return rows.reduce<RiderCategorySplit>(
    (acc, b) => ({ bmart: addCat(acc.bmart, b.bmart), store: addCat(acc.store, b.store) }),
    { bmart: EMPTY, store: EMPTY },
  )
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
