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
import { addDaysIso, clampCustomRange } from '@/lib/admin/date-range'
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

/** 커스텀 기간(시작~마감, 클램프 완료된 범위) 집계 뷰 — 홈/라이더/지표 공용. */
export async function getAdminCustomView(range: PeriodRange): Promise<AdminPeriodView> {
  const rows = await fetchSnapshotsRange(range.start_date, range.end_date)
  return toView(rows, range)
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

export interface AdminGoalsData {
  /** 현재 영업일(-6h 앵커) — 상단 '오늘 현황' 기준. */
  businessToday: string
  today: CenterPeakGoalRow[]
  /** 조회 범위 내 과거 이력(최신 날짜 우선). 당일은 미포함(상단이 담당). */
  history: CenterPeakGoalRow[]
  range: PeriodRange
}

/**
 * 센터 공동목표 — 오늘(영업일) 현황 + 과거 이력(자유 범위, 스팬 제한 없음).
 * from/to 미지정 시 최근 7일(어제까지). 당일 제외 클램프는 커스텀 기간과 동일 규칙.
 */
export async function getAdminGoalsData(fromRaw?: unknown, toRaw?: unknown, ref?: string): Promise<AdminGoalsData> {
  const supabase = createAdminClient()
  const { start_date: businessToday } = await getPeriodRange('today', ref)
  const defaultEnd = addDaysIso(businessToday, -1)
  const range =
    clampCustomRange(fromRaw, toRaw, businessToday, null) ??
    { start_date: addDaysIso(defaultEnd, -6), end_date: defaultEnd }

  const todayQuery = supabase.from('center_peak_goals').select('*').eq('snapshot_date', businessToday)

  // 이력은 자유 범위(과거 전체 가능) — 4행/일이지만 장기 조회 대비 페이징 루프.
  const BATCH = 1000
  const history: CenterPeakGoalRow[] = []
  const fetchHistoryPage = (offset: number) =>
    supabase
      .from('center_peak_goals')
      .select('*')
      .gte('snapshot_date', range.start_date)
      .lte('snapshot_date', range.end_date)
      .order('snapshot_date', { ascending: false })
      .order('peak_key', { ascending: true })
      .range(offset, offset + BATCH - 1)

  const [todayRes, firstPage] = await Promise.all([todayQuery, fetchHistoryPage(0)])
  if (todayRes.error) throw todayRes.error
  if (firstPage.error) throw firstPage.error
  history.push(...(firstPage.data ?? []))
  let lastLen = firstPage.data?.length ?? 0
  for (let offset = BATCH; lastLen === BATCH; offset += BATCH) {
    const page = await fetchHistoryPage(offset)
    if (page.error) throw page.error
    history.push(...(page.data ?? []))
    lastLen = page.data?.length ?? 0
  }

  return { businessToday, today: todayRes.data ?? [], history, range }
}
