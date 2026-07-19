import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  aggregateByDate,
  aggregateByRider,
  aggregateTotals,
  sliceRange,
  type AdminSnapshotRow,
  type AdminTotals,
  type DailyTotals,
  type RiderTotals,
} from '@/lib/admin/aggregate'
import type { CenterPeakGoalRow, SlaPeriod } from '@/types/database'

/**
 * 관리자(협력사) 데이터 접근 — service_role 전용. /admin 미들웨어 가드 뒤에서만 호출.
 * 기간 경계는 라이더 대시보드와 동일 소스(sla_period_range RPC: 영업일 -6h, 주=수요일).
 * 일간/주간/월간은 superset 한 번 fetch 후 슬라이스(월간이 항상 최장 — 주간은 월초에
 * 전월로 걸칠 수 있어 시작일 min 으로 커버).
 */

export interface PeriodRange {
  start_date: string
  end_date: string
}

export interface AdminPeriodView {
  range: PeriodRange
  totals: AdminTotals
  riders: RiderTotals[]
  daily: DailyTotals[]
}

export interface AdminDashboardData {
  today: AdminPeriodView
  week: AdminPeriodView
  month: AdminPeriodView
  /** admin_rider_id → 표시 정보. */
  riderInfo: Record<string, { name: string | null; isActive: boolean }>
  /** 등록 라이더 수(활성 기준). */
  registeredRiders: number
}

const SNAPSHOT_COLUMNS =
  'admin_rider_id, snapshot_date, sla_score, completed, rejected, dispatch_canceled, delivery_canceled, assigned, acceptance_rate, peak_morning, peak_afternoon, peak_evening, peak_midnight, breakdown, captured_at'

export async function getPeriodRange(period: SlaPeriod, ref?: string): Promise<PeriodRange> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('sla_period_range', {
    p_period: period,
    p_ref: ref ?? null,
  })
  if (error) throw error
  return data[0]
}

/** PostgREST 기본 1000행 제한 — 범위 fetch 는 반드시 페이징 루프. */
async function fetchSnapshotsRange(startDate: string, endDate: string): Promise<AdminSnapshotRow[]> {
  const supabase = createAdminClient()
  const BATCH = 1000
  const rows: AdminSnapshotRow[] = []
  for (let offset = 0; ; offset += BATCH) {
    const { data, error } = await supabase
      .from('sla_snapshots')
      .select(SNAPSHOT_COLUMNS)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('id', { ascending: true })
      .range(offset, offset + BATCH - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < BATCH) return rows
  }
}

async function fetchRiderInfo(): Promise<{
  info: Record<string, { name: string | null; isActive: boolean }>
  registered: number
}> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('riders').select('admin_rider_id, name, is_active')
  if (error) throw error
  const info: Record<string, { name: string | null; isActive: boolean }> = {}
  let registered = 0
  for (const r of data ?? []) {
    info[r.admin_rider_id] = { name: r.name, isActive: r.is_active }
    if (r.is_active) registered += 1
  }
  return { info, registered }
}

function toView(rows: AdminSnapshotRow[], range: PeriodRange): AdminPeriodView {
  const sliced = sliceRange(rows, range.start_date, range.end_date)
  return {
    range,
    totals: aggregateTotals(sliced),
    riders: aggregateByRider(sliced),
    daily: aggregateByDate(sliced),
  }
}

/** 관리자 대시보드 전체(일간/주간/월간 + 라이더 정보) — 스냅샷은 superset 1회 fetch. */
export async function getAdminDashboardData(ref?: string): Promise<AdminDashboardData> {
  const [today, week, month] = await Promise.all([
    getPeriodRange('today', ref),
    getPeriodRange('week', ref),
    getPeriodRange('month', ref),
  ])
  const supersetStart = [today.start_date, week.start_date, month.start_date].sort()[0]
  const supersetEnd = [today.end_date, week.end_date, month.end_date].sort().at(-1) as string

  const [rows, riderMeta] = await Promise.all([
    fetchSnapshotsRange(supersetStart, supersetEnd),
    fetchRiderInfo(),
  ])

  return {
    today: toView(rows, today),
    week: toView(rows, week),
    month: toView(rows, month),
    riderInfo: riderMeta.info,
    registeredRiders: riderMeta.registered,
  }
}

export interface AdminRiderDetail {
  adminRiderId: string
  name: string | null
  isActive: boolean
  phone: string | null
  centerId: string | null
  today: { range: PeriodRange; totals: AdminTotals }
  week: { range: PeriodRange; totals: AdminTotals }
  month: { range: PeriodRange; totals: AdminTotals }
  /** 월간 범위 내 일별 행(최신순) — 상세 테이블용. */
  daily: DailyTotals[]
}

/** 라이더 1명 상세 — 본인 스냅샷만 fetch(범위=월간∪주간). */
export async function getAdminRiderDetail(adminRiderId: string, ref?: string): Promise<AdminRiderDetail | null> {
  const supabase = createAdminClient()
  const { data: rider, error: riderError } = await supabase
    .from('riders')
    .select('admin_rider_id, name, phone, is_active, center_id')
    .eq('admin_rider_id', adminRiderId)
    .maybeSingle()
  if (riderError) throw riderError
  if (!rider) return null

  const [today, week, month] = await Promise.all([
    getPeriodRange('today', ref),
    getPeriodRange('week', ref),
    getPeriodRange('month', ref),
  ])
  const start = [today.start_date, week.start_date, month.start_date].sort()[0]
  const end = [today.end_date, week.end_date, month.end_date].sort().at(-1) as string

  const { data, error } = await supabase
    .from('sla_snapshots')
    .select(SNAPSHOT_COLUMNS)
    .eq('admin_rider_id', adminRiderId)
    .gte('snapshot_date', start)
    .lte('snapshot_date', end)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  const rows = data ?? []

  return {
    adminRiderId: rider.admin_rider_id,
    name: rider.name,
    isActive: rider.is_active,
    phone: rider.phone,
    centerId: rider.center_id,
    today: { range: today, totals: aggregateTotals(sliceRange(rows, today.start_date, today.end_date)) },
    week: { range: week, totals: aggregateTotals(sliceRange(rows, week.start_date, week.end_date)) },
    month: { range: month, totals: aggregateTotals(sliceRange(rows, month.start_date, month.end_date)) },
    daily: aggregateByDate(sliceRange(rows, month.start_date, month.end_date)).reverse(),
  }
}

/** 센터 공동목표 — 최근 n 영업일(기본 7) 이력, 최신 날짜 우선. */
export async function getAdminCenterGoals(days = 7, ref?: string): Promise<CenterPeakGoalRow[]> {
  const supabase = createAdminClient()
  const { start_date } = await getPeriodRange('today', ref)
  const from = new Date(`${start_date}T00:00:00Z`)
  from.setUTCDate(from.getUTCDate() - (days - 1))
  const { data, error } = await supabase
    .from('center_peak_goals')
    .select('*')
    .gte('snapshot_date', from.toISOString().slice(0, 10))
    .lte('snapshot_date', start_date)
    .order('snapshot_date', { ascending: false })
  if (error) throw error
  return data ?? []
}
