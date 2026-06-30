/**
 * 배민 delivery-status → 우리 스키마(ScrapeResult) 매핑.
 * 매핑표/산식: docs/api/baemin-source.md §"확정 (backend Task #17)".
 *
 * 산식 확정(#17):
 *   assigned        = complete+reject+cancel+riderFault (배차 제안 총량)
 *   acceptance_rate = (assigned-reject)/assigned×100 (수락률 = 수락/제안)
 *                     └ 기존 RPC get_rider_summary 기간 산식과 일치(일별/기간 정합)
 *   sla_score(잠정) = complete/assigned×100 (완료율 기반). 배민 실점수(달성현황 beta) 확보 시 교체
 *   peak_*          = deliveryPeakTimeCount(morning/afternoon/evening/midnight)
 *   breakdown       = 푸드/비마트/스토어 카테고리 세부(jsonb)
 */
import type { DeliveryStatusRow } from './baemin-types'
import type {
  CenterCurrentUpsert,
  HourlyStatUpsert,
  RiderUpsert,
  ScrapeResult,
  SlaCategoryBreakdown,
  SlaSnapshotUpsert,
} from '../types'

const n = (v: number | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

function toBreakdown(a: NonNullable<DeliveryStatusRow['deliveryAcceptanceCount']>): SlaCategoryBreakdown {
  return {
    food: { complete: n(a.foodComplete), reject: n(a.foodReject), cancel: n(a.foodCancel), riderFault: n(a.foodRiderFault) },
    bmart: { complete: n(a.bmartComplete), reject: n(a.bmartReject), cancel: n(a.bmartCancel), riderFault: n(a.bmartRiderFault) },
    store: { complete: n(a.storeComplete), reject: n(a.storeReject), cancel: n(a.storeCancel), riderFault: n(a.storeRiderFault) },
  }
}

/** 한 라이더 행 → 스냅샷 1건. */
function toSnapshot(row: DeliveryStatusRow, snapshotDate: string): SlaSnapshotUpsert {
  const a = row.deliveryAcceptanceCount ?? {}
  const completed = n(a.totalComplete)
  const rejected = n(a.totalReject)
  const dispatchCanceled = n(a.totalCancel) // 배차취소
  const deliveryCanceled = n(a.totalRiderFault) // 배달취소(라이더귀책)

  const assigned = completed + rejected + dispatchCanceled + deliveryCanceled
  // 수락률 = 수락(제안-거절)/제안. assigned=0 → null. (get_rider_summary 기간식과 동일)
  const acceptanceRate = assigned > 0 ? round2(((assigned - rejected) / assigned) * 100) : null
  // 잠정 SLA = 완료율. 배민 실점수 확보 시 교체.
  const slaScore = assigned > 0 ? round2((completed / assigned) * 100) : null

  const p = row.deliveryPeakTimeCount

  return {
    admin_rider_id: row.userId,
    snapshot_date: snapshotDate,
    completed,
    rejected,
    dispatch_canceled: dispatchCanceled,
    delivery_canceled: deliveryCanceled,
    assigned,
    acceptance_rate: acceptanceRate,
    sla_score: slaScore,
    peak_morning: n(p?.morning),
    peak_afternoon: n(p?.afternoon),
    peak_evening: n(p?.evening),
    peak_midnight: n(p?.midnight),
    breakdown: toBreakdown(a),
  }
}

/**
 * delivery-status 행 배열 → ScrapeResult.
 * snapshotDate 는 호출부가 TZ 영업일로 결정해 주입(계약상 "오늘 누적" 가정).
 * centerId(있으면) 는 delivery-status 요청의 center-id 헤더값 — riders.center_id 로 스탬프
 * (공동목표 RPC 가 라이더→센터 해석에 사용).
 */
export function mapDeliveryStatus(
  rows: DeliveryStatusRow[],
  snapshotDate: string,
  centerId?: string | null,
): ScrapeResult {
  const riders: RiderUpsert[] = []
  const snapshots: SlaSnapshotUpsert[] = []
  const hourly: HourlyStatUpsert[] = []

  for (const row of rows) {
    if (!row.userId) continue // 식별키 없으면 적재 불가 — 스킵

    riders.push({
      admin_rider_id: row.userId,
      name: row.name ?? null,
      phone: row.phoneNumber ?? null,
      is_active: true,
      ...(centerId ? { center_id: centerId } : {}),
    })

    snapshots.push(toSnapshot(row, snapshotDate))

    for (const h of row.hourlyCompleted ?? []) {
      if (typeof h.hour !== 'number' || h.hour < 0 || h.hour > 23) continue
      hourly.push({
        admin_rider_id: row.userId,
        snapshot_date: snapshotDate,
        hour: h.hour,
        completed: n(h.count),
      })
    }
  }

  // 센터 피크별 실시간 current = 라이더 peak 완료수 합산(배민 deliveryPeakTimeCount).
  // Looker 공동목표(지연)에 의존하지 않고 1분 주기로 실값 반영. peak_key 는 Looker 와 동일 분류.
  const centerPeakCurrents: CenterCurrentUpsert[] | undefined = centerId
    ? ([
        ['ml', 'peak_morning'],
        ['pl', 'peak_afternoon'],
        ['d', 'peak_evening'],
        ['pd', 'peak_midnight'],
      ] as const).map(([peak_key, field]) => ({
        center_id: centerId,
        snapshot_date: snapshotDate,
        peak_key,
        current: snapshots.reduce((acc, s) => acc + (s[field] ?? 0), 0),
      }))
    : undefined

  return { riders, snapshots, hourly, ...(centerPeakCurrents ? { centerPeakCurrents } : {}) }
}
