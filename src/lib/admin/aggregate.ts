/**
 * 관리자 집계 — sla_snapshots 행 배열을 기간/라이더/일별로 순수 집계.
 * 서버 의존 없음(테스트 용이). 데이터 접근은 @/lib/supabase/admin-queries.
 *
 * 산식은 라이더 대시보드와 동일 규약:
 * - 수락률 = 배민 공식(푸드완료 / 푸드 완료+거절+취소+귀책, 0011). breakdown 전무 시
 *   저장된 일별 acceptance_rate 평균 폴백(RPC 0011 과 동일).
 * - 거절률 = 푸드거절 / 같은 분모 (수락률과 대비 가능).
 * - SLA 점수 = completed 가중 평균(RPC 와 동일).
 * - B마트/푸드 세부는 breakdown(0004) 합산 — 일반 표시는 (합계 − B마트).
 */
import type { SlaCategoryCounts, SlaSnapshotRow } from '@/types/database'

export type AdminSnapshotRow = Pick<
  SlaSnapshotRow,
  | 'admin_rider_id'
  | 'snapshot_date'
  | 'sla_score'
  | 'completed'
  | 'rejected'
  | 'dispatch_canceled'
  | 'delivery_canceled'
  | 'assigned'
  | 'acceptance_rate'
  | 'peak_morning'
  | 'peak_afternoon'
  | 'peak_evening'
  | 'peak_midnight'
  | 'breakdown'
  | 'captured_at'
>

export interface AdminTotals {
  completed: number
  rejected: number
  dispatchCanceled: number
  deliveryCanceled: number
  assigned: number
  food: SlaCategoryCounts
  bmart: SlaCategoryCounts
  /** 수락률(%, 푸드 공식). 분모 0 + 폴백 불가 시 null. */
  acceptanceRate: number | null
  /** 거절률(%, 푸드거절/푸드분모). 분모 0 이면 null. */
  rejectionRate: number | null
  /** SLA 점수(completed 가중 평균). 데이터 없으면 null. */
  slaScore: number | null
  peaks: { morning: number; afternoon: number; evening: number; midnight: number }
  /** 기간 내 실적(assigned>0) 있는 라이더 수. */
  activeRiders: number
  lastCapturedAt: string | null
}

export interface RiderTotals extends AdminTotals {
  adminRiderId: string
  /** 기간 내 스냅샷 보유 일수. */
  activeDays: number
}

export interface DailyTotals extends AdminTotals {
  date: string
}

const EMPTY_CAT: SlaCategoryCounts = { complete: 0, reject: 0, cancel: 0, riderFault: 0 }

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function addCat(acc: SlaCategoryCounts, c: SlaCategoryCounts | undefined): SlaCategoryCounts {
  if (!c) return acc
  return {
    complete: acc.complete + (c.complete ?? 0),
    reject: acc.reject + (c.reject ?? 0),
    cancel: acc.cancel + (c.cancel ?? 0),
    riderFault: acc.riderFault + (c.riderFault ?? 0),
  }
}

/** 행 배열 → 합계 1건. */
export function aggregateTotals(rows: AdminSnapshotRow[]): AdminTotals {
  let completed = 0
  let rejected = 0
  let dispatchCanceled = 0
  let deliveryCanceled = 0
  let assigned = 0
  let food = EMPTY_CAT
  let bmart = EMPTY_CAT
  let slaWeighted = 0
  let slaWeight = 0
  let slaSum = 0
  let slaCount = 0
  let accSum = 0
  let accCount = 0
  const peaks = { morning: 0, afternoon: 0, evening: 0, midnight: 0 }
  const activeByRider = new Set<string>()
  let lastCapturedAt: string | null = null

  for (const r of rows) {
    completed += r.completed
    rejected += r.rejected
    dispatchCanceled += r.dispatch_canceled
    deliveryCanceled += r.delivery_canceled
    assigned += r.assigned
    food = addCat(food, r.breakdown?.food)
    bmart = addCat(bmart, r.breakdown?.bmart)
    if (r.sla_score != null) {
      slaWeighted += r.sla_score * r.completed
      slaWeight += r.completed
      slaSum += r.sla_score
      slaCount += 1
    }
    if (r.acceptance_rate != null) {
      accSum += r.acceptance_rate
      accCount += 1
    }
    peaks.morning += r.peak_morning
    peaks.afternoon += r.peak_afternoon
    peaks.evening += r.peak_evening
    peaks.midnight += r.peak_midnight
    if (r.assigned > 0) activeByRider.add(r.admin_rider_id)
    if (lastCapturedAt == null || r.captured_at > lastCapturedAt) lastCapturedAt = r.captured_at
  }

  const foodDenom = food.complete + food.reject + food.cancel + food.riderFault
  const acceptanceRate =
    foodDenom > 0
      ? round2((food.complete / foodDenom) * 100)
      : accCount > 0
        ? round2(accSum / accCount) // breakdown 전무(과거 데이터) 폴백 — RPC 0011 동일
        : null
  const rejectionRate = foodDenom > 0 ? round2((food.reject / foodDenom) * 100) : null
  const slaScore =
    slaWeight > 0 ? round2(slaWeighted / slaWeight) : slaCount > 0 ? round2(slaSum / slaCount) : null

  return {
    completed,
    rejected,
    dispatchCanceled,
    deliveryCanceled,
    assigned,
    food,
    bmart,
    acceptanceRate,
    rejectionRate,
    slaScore,
    peaks,
    activeRiders: activeByRider.size,
    lastCapturedAt,
  }
}

/** 라이더별 합계 — completed 내림차순. */
export function aggregateByRider(rows: AdminSnapshotRow[]): RiderTotals[] {
  const byRider = new Map<string, AdminSnapshotRow[]>()
  for (const r of rows) {
    const list = byRider.get(r.admin_rider_id)
    if (list) list.push(r)
    else byRider.set(r.admin_rider_id, [r])
  }
  return [...byRider.entries()]
    .map(([adminRiderId, riderRows]) => ({
      adminRiderId,
      activeDays: new Set(riderRows.map((r) => r.snapshot_date)).size,
      ...aggregateTotals(riderRows),
    }))
    .sort((a, b) => b.completed - a.completed)
}

/** 일별 합계 — 날짜 오름차순. */
export function aggregateByDate(rows: AdminSnapshotRow[]): DailyTotals[] {
  const byDate = new Map<string, AdminSnapshotRow[]>()
  for (const r of rows) {
    const list = byDate.get(r.snapshot_date)
    if (list) list.push(r)
    else byDate.set(r.snapshot_date, [r])
  }
  return [...byDate.entries()]
    .map(([date, dateRows]) => ({ date, ...aggregateTotals(dateRows) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** 기간 슬라이스 — superset fetch 에서 기간별 행만 추출. */
export function sliceRange(rows: AdminSnapshotRow[], startDate: string, endDate: string): AdminSnapshotRow[] {
  return rows.filter((r) => r.snapshot_date >= startDate && r.snapshot_date <= endDate)
}
