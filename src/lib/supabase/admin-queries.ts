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
import { memoized } from '@/lib/admin/memo'
import type { CenterPeakGoalRow, SlaPeriod } from '@/types/database'

/**
 * 관리자(협력사) 데이터 접근 — service_role 전용. /admin 미들웨어 가드 뒤에서만 호출.
 * 기간 경계는 라이더 대시보드와 동일 소스(sla_period_range RPC: 영업일 -6h, 주=수요일).
 *
 * 성능 규약(2026-07-20 최적화):
 * - 모든 fetch 는 TTL 메모(웜 인스턴스 재사용 + 인플라이트 디듀프). 오늘 포함 범위 25s
 *   (스크래퍼 60s 주기 대비 신선), 과거 완결 범위 10분, 라이더 명부 5분, 기간 경계 60s.
 * - 페이지드 fetch 는 count 선조회 후 병렬 요청(순차 루프 금지 — 왕복 지연 누적 방지).
 * - 목록/지표 페이지는 필요한 기간 범위만 fetch(getAdminPeriodView) — 홈만 3기간 superset.
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

export interface AdminRiderInfoMap {
  /** admin_rider_id → 표시 정보. */
  info: Record<string, { name: string | null; isActive: boolean }>
  /** 등록 라이더 수(활성 기준). */
  registered: number
}

export interface AdminDashboardData {
  today: AdminPeriodView
  week: AdminPeriodView
  month: AdminPeriodView
  riderInfo: AdminRiderInfoMap['info']
  registeredRiders: number
}

const SNAPSHOT_COLUMNS =
  'admin_rider_id, snapshot_date, sla_score, completed, rejected, dispatch_canceled, delivery_canceled, assigned, acceptance_rate, peak_morning, peak_afternoon, peak_evening, peak_midnight, breakdown, captured_at'

const TTL_LIVE_MS = 25_000 // 오늘 포함 데이터
const TTL_SETTLED_MS = 10 * 60_000 // 과거 완결 데이터(더 이상 변하지 않음)
const TTL_RANGE_MS = 60_000 // 기간 경계(영업일 전환 시에만 변함)
const TTL_RIDERS_MS = 5 * 60_000 // 라이더 명부

export function getPeriodRange(period: SlaPeriod, ref?: string): Promise<PeriodRange> {
  return memoized(`range:${period}:${ref ?? 'now'}`, TTL_RANGE_MS, async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('sla_period_range', {
      p_period: period,
      p_ref: ref ?? null,
    })
    if (error) throw error
    return data[0]
  })
}

/**
 * 범위 스냅샷 fetch — count 선조회 후 전 페이지 병렬(PostgREST 1000행 제한).
 * count 시점 이후 유입된 행 대비: 마지막 페이지가 꽉 찼으면 짧은 페이지가 나올 때까지 추가 조회.
 */
async function fetchSnapshotsRangeRaw(startDate: string, endDate: string): Promise<AdminSnapshotRow[]> {
  const supabase = createAdminClient()
  const BATCH = 1000

  const base = () =>
    supabase
      .from('sla_snapshots')
      .select(SNAPSHOT_COLUMNS)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('id', { ascending: true })

  const { count, error: countError } = await supabase
    .from('sla_snapshots')
    .select('id', { count: 'exact', head: true })
    .gte('snapshot_date', startDate)
    .lte('snapshot_date', endDate)
  if (countError) throw countError

  const pages = Math.max(1, Math.ceil((count ?? 0) / BATCH))
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) => base().range(i * BATCH, (i + 1) * BATCH - 1)),
  )
  const rows: AdminSnapshotRow[] = []
  for (const r of results) {
    if (r.error) throw r.error
    rows.push(...(r.data ?? []))
  }

  // 방어: count 이후 유입분 — 마지막 페이지가 꽉 찼으면 이어서 순차 보충.
  let lastLen = results.at(-1)?.data?.length ?? 0
  for (let offset = pages * BATCH; lastLen === BATCH; offset += BATCH) {
    const { data, error } = await base().range(offset, offset + BATCH - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    lastLen = data?.length ?? 0
  }
  return rows
}

function fetchSnapshotsRange(range: PeriodRange, businessToday: string): Promise<AdminSnapshotRow[]> {
  const ttl = range.end_date < businessToday ? TTL_SETTLED_MS : TTL_LIVE_MS
  return memoized(`snap:${range.start_date}:${range.end_date}`, ttl, () =>
    fetchSnapshotsRangeRaw(range.start_date, range.end_date),
  )
}

/** 라이더 명부(이름/활성) — 5분 메모. */
export function getAdminRiderInfo(): Promise<AdminRiderInfoMap> {
  return memoized('riders', TTL_RIDERS_MS, async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('riders').select('admin_rider_id, name, is_active')
    if (error) throw error
    const info: AdminRiderInfoMap['info'] = {}
    let registered = 0
    for (const r of data ?? []) {
      info[r.admin_rider_id] = { name: r.name, isActive: r.is_active }
      if (r.is_active) registered += 1
    }
    return { info, registered }
  })
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

/** 단일 기간 뷰(라이더 목록/지표 페이지) — 해당 범위만 fetch. */
export async function getAdminPeriodView(
  period: SlaPeriod,
  ref?: string,
): Promise<{ view: AdminPeriodView; businessToday: string }> {
  const [range, todayRange] = await Promise.all([getPeriodRange(period, ref), getPeriodRange('today', ref)])
  const rows = await fetchSnapshotsRange(range, todayRange.start_date)
  return { view: toView(rows, range), businessToday: todayRange.start_date }
}

/** 커스텀 기간 뷰 — 클램프 완료 범위(항상 과거 완결)라 긴 TTL 로 fetch. */
export async function getAdminCustomView(range: PeriodRange): Promise<AdminPeriodView> {
  // clampCustomRange 가 마감을 어제 이하로 보장 — end < businessToday 로 취급.
  const rows = await memoized(`snap:${range.start_date}:${range.end_date}`, TTL_SETTLED_MS, () =>
    fetchSnapshotsRangeRaw(range.start_date, range.end_date),
  )
  return toView(rows, range)
}

/** 관리자 홈 전체(일간/주간/월간 + 라이더 정보) — 스냅샷은 superset 1회 fetch. */
export async function getAdminDashboardData(ref?: string): Promise<AdminDashboardData> {
  const [today, week, month, riderMeta] = await Promise.all([
    getPeriodRange('today', ref),
    getPeriodRange('week', ref),
    getPeriodRange('month', ref),
    getAdminRiderInfo(),
  ])
  const superset: PeriodRange = {
    start_date: [today.start_date, week.start_date, month.start_date].sort()[0],
    end_date: [today.end_date, week.end_date, month.end_date].sort().at(-1) as string,
  }
  const rows = await fetchSnapshotsRange(superset, today.start_date)

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
  const [riderRes, today, week, month] = await Promise.all([
    supabase
      .from('riders')
      .select('admin_rider_id, name, phone, is_active, center_id')
      .eq('admin_rider_id', adminRiderId)
      .maybeSingle(),
    getPeriodRange('today', ref),
    getPeriodRange('week', ref),
    getPeriodRange('month', ref),
  ])
  if (riderRes.error) throw riderRes.error
  const rider = riderRes.data
  if (!rider) return null

  const start = [today.start_date, week.start_date, month.start_date].sort()[0]
  const end = [today.end_date, week.end_date, month.end_date].sort().at(-1) as string

  const rows = await memoized(`snap-rider:${adminRiderId}:${start}:${end}`, TTL_LIVE_MS, async () => {
    const { data, error } = await supabase
      .from('sla_snapshots')
      .select(SNAPSHOT_COLUMNS)
      .eq('admin_rider_id', adminRiderId)
      .gte('snapshot_date', start)
      .lte('snapshot_date', end)
      .order('snapshot_date', { ascending: false })
    if (error) throw error
    return data ?? []
  })

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
 * 오늘 현황 25s / 과거 이력 10분 메모.
 */
export async function getAdminGoalsData(fromRaw?: unknown, toRaw?: unknown, ref?: string): Promise<AdminGoalsData> {
  const { start_date: businessToday } = await getPeriodRange('today', ref)
  const defaultEnd = addDaysIso(businessToday, -1)
  const range =
    clampCustomRange(fromRaw, toRaw, businessToday, null) ??
    { start_date: addDaysIso(defaultEnd, -6), end_date: defaultEnd }

  const todayRows = memoized(`goals-today:${businessToday}`, TTL_LIVE_MS, async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('center_peak_goals')
      .select('*')
      .eq('snapshot_date', businessToday)
    if (error) throw error
    return data ?? []
  })

  const historyRows = memoized(
    `goals-hist:${range.start_date}:${range.end_date}`,
    TTL_SETTLED_MS,
    async () => {
      const supabase = createAdminClient()
      const BATCH = 1000
      const history: CenterPeakGoalRow[] = []
      const page = (offset: number) =>
        supabase
          .from('center_peak_goals')
          .select('*')
          .gte('snapshot_date', range.start_date)
          .lte('snapshot_date', range.end_date)
          .order('snapshot_date', { ascending: false })
          .order('peak_key', { ascending: true })
          .range(offset, offset + BATCH - 1)

      let lastLen = BATCH
      for (let offset = 0; lastLen === BATCH; offset += BATCH) {
        const { data, error } = await page(offset)
        if (error) throw error
        history.push(...(data ?? []))
        lastLen = data?.length ?? 0
      }
      return history
    },
  )

  const [todayData, historyData] = await Promise.all([todayRows, historyRows])
  return { businessToday, today: todayData, history: historyData, range }
}
