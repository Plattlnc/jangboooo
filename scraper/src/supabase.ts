/**
 * Supabase service_role 클라이언트 + 멱등 upsert 헬퍼.
 * service_role 키는 RLS 를 우회하므로 스크래퍼(서버) 전용. 노출 금지.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config'
import type { CenterCurrentUpsert, CenterGoalUpsert, DeliveryFeeDetail, HourlyStatUpsert, RiderContractStatus, RiderDailyFee, RiderExtraPayment, RiderInsurance, RiderUpsert, RiderWeeklyInsurance, SlaSnapshotUpsert, WeeklyRevenue, WorkingStatusSummary } from './types'

export type Db = SupabaseClient

// 실시간 근무 인원 스냅샷 — DDL 없이 Storage 에 단일 JSON 으로 적재(앱이 관리자 홈에서 읽음).
const OPS_BUCKET = 'ops'
const WORKING_STATUS_PATH = 'working-status.json'

/** PostgREST 에러를 맥락과 함께 감싼다. */
export class SupabaseUpsertError extends Error {
  constructor(
    table: string,
    public override readonly cause: unknown,
  ) {
    super(`Supabase upsert 실패: ${table}`)
    this.name = 'SupabaseUpsertError'
  }
}

export function createDb(cfg: Config): Db {
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'jangboooo-scraper' } },
  })
}

/** riders 멱등 upsert (PK: admin_rider_id). 반환: 적재 시도 행 수. */
export async function upsertRiders(db: Db, rows: RiderUpsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db.from('riders').upsert(rows, { onConflict: 'admin_rider_id' })
  if (error) throw new SupabaseUpsertError('riders', error)
  return rows.length
}

/**
 * 시간제보험료(배달처리비 xlsx ‘보험’ 시트)를 Storage(settlement/rider-insurance.json)에 적재.
 * 구조: { 'YYYY-MM-DD': { riderId: amount } }. 이번 파싱에 포함된 날짜는 재작성(멱등). DDL 불필요.
 */
export async function upsertInsurance(db: Db, rows: RiderInsurance[]): Promise<number> {
  if (rows.length === 0) return 0
  await db.storage.createBucket('settlement', { public: false }).catch(() => {})
  let existing: Record<string, Record<string, number>> = {}
  const dl = await db.storage.from('settlement').download('rider-insurance.json')
  if (dl.data) {
    try {
      const parsed = JSON.parse(await dl.data.text())
      if (parsed && typeof parsed === 'object') existing = parsed
    } catch {
      /* 무시 */
    }
  }
  const byDate: Record<string, Record<string, number>> = { ...existing }
  for (const d of new Set(rows.map((r) => r.snapshot_date))) byDate[d] = {} // 포함된 날짜는 재작성(멱등)
  for (const r of rows) {
    const m = (byDate[r.snapshot_date] ??= {})
    m[r.admin_rider_id] = (m[r.admin_rider_id] ?? 0) + r.amount
  }
  const body = Buffer.from(JSON.stringify(byDate), 'utf-8')
  const { error } = await db.storage
    .from('settlement')
    .upload('rider-insurance.json', body, { upsert: true, contentType: 'application/json; charset=utf-8' })
  if (error) throw new Error(`시간제보험료 Storage 업로드 실패: ${error.message}`)
  return rows.length
}

/**
 * 실시간 근무 인원 요약을 Storage(ops/working-status.json)에 라이브 스냅샷으로 덮어쓴다.
 * DDL 불필요. best-effort(호출부에서 실패를 흡수) — SLA 적재에 영향 주지 않는다.
 */
export async function upsertWorkingStatus(
  db: Db,
  summary: WorkingStatusSummary,
  capturedAt: string,
): Promise<void> {
  await db.storage.createBucket(OPS_BUCKET, { public: false }).catch(() => {})
  const body = Buffer.from(JSON.stringify({ ...summary, captured_at: capturedAt }), 'utf-8')
  const { error } = await db.storage
    .from(OPS_BUCKET)
    .upload(WORKING_STATUS_PATH, body, { contentType: 'application/json', upsert: true })
  if (error) throw new Error(`working-status Storage 업로드 실패: ${error.message}`)
}

/** sla_snapshots 멱등 upsert (키: admin_rider_id, snapshot_date). */
export async function upsertSlaSnapshots(db: Db, rows: SlaSnapshotUpsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db.from('sla_snapshots').upsert(rows, { onConflict: 'admin_rider_id,snapshot_date' })
  if (error) throw new SupabaseUpsertError('sla_snapshots', error)
  return rows.length
}

/** rider_daily_fees 멱등 upsert (키: admin_rider_id, snapshot_date). 배달처리비(세전 수입). */
export async function upsertRiderDailyFees(db: Db, rows: RiderDailyFee[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db.from('rider_daily_fees').upsert(rows, { onConflict: 'admin_rider_id,snapshot_date' })
  if (error) throw new SupabaseUpsertError('rider_daily_fees', error)
  return rows.length
}

/**
 * rider_extra_payments 멱등 upsert (키: week_start,admin_rider_id,delivery_info,reason).
 * 주정산서 재수집 시 같은 주차 행이 겹쳐도 안전. 이 주차의 기존 행 중 이번에 안 온 것은
 * 남지만, 원본이 append-only(건별)라 실무상 문제 없음.
 */
export async function upsertRiderExtraPayments(db: Db, rows: RiderExtraPayment[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db
    .from('rider_extra_payments')
    .upsert(rows, { onConflict: 'week_start,admin_rider_id,delivery_info,reason' })
  if (error) throw new SupabaseUpsertError('rider_extra_payments', error)
  return rows.length
}

/** rider_weekly_insurance 멱등 upsert (키: week_start,admin_rider_id). 주차별 라이더 1행. */
export async function upsertRiderWeeklyInsurance(db: Db, rows: RiderWeeklyInsurance[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db
    .from('rider_weekly_insurance')
    .upsert(rows, { onConflict: 'week_start,admin_rider_id' })
  if (error) throw new SupabaseUpsertError('rider_weekly_insurance', error)
  return rows.length
}

/** weekly_revenue 멱등 upsert (키: week_start). 주간 매출(관리비) 1행. */
export async function upsertWeeklyRevenue(db: Db, row: WeeklyRevenue | null): Promise<number> {
  if (!row) return 0
  const { error } = await db
    .from('weekly_revenue')
    .upsert({ ...row, captured_at: new Date().toISOString() }, { onConflict: 'week_start' })
  if (error) throw new SupabaseUpsertError('weekly_revenue', error)
  return 1
}

/** rider_contract_status 멱등 upsert (키: admin_rider_id). captured_at 갱신으로 신선도 표시. */
export async function upsertRiderContractStatus(db: Db, rows: RiderContractStatus[]): Promise<number> {
  if (rows.length === 0) return 0
  const capturedAt = new Date().toISOString()
  const payload = rows.map((r) => ({ ...r, captured_at: capturedAt }))
  const { error } = await db.from('rider_contract_status').upsert(payload, { onConflict: 'admin_rider_id' })
  if (error) throw new SupabaseUpsertError('rider_contract_status', error)
  return payload.length
}

/** delivery_fee_details 멱등 upsert (키: delivery_no). 배달건별 상세(취소 포함). 청크 500. */
export async function upsertDeliveryFeeDetails(db: Db, rows: DeliveryFeeDetail[]): Promise<number> {
  if (rows.length === 0) return 0
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500)
    const { error } = await db.from('delivery_fee_details').upsert(chunk, { onConflict: 'delivery_no' })
    if (error) throw new SupabaseUpsertError('delivery_fee_details', error)
  }
  return rows.length
}

/** rider_hourly_stats 멱등 upsert (키: admin_rider_id, snapshot_date, hour). */
export async function upsertHourlyStats(db: Db, rows: HourlyStatUpsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db
    .from('rider_hourly_stats')
    .upsert(rows, { onConflict: 'admin_rider_id,snapshot_date,hour' })
  if (error) throw new SupabaseUpsertError('rider_hourly_stats', error)
  return rows.length
}

/**
 * center_peak_goals 의 goal(목표)만 upsert — Looker(달성현황 beta) 소스 전용.
 * current/pct 는 배민 실시간 집계(upsertCenterCurrents)가 소유하므로 여기선 건드리지 않는다.
 * (지연된 Looker 의 current=0 이 정상 current 를 덮어쓰는 회귀 차단.) 충돌 시 goal·center_name 만 갱신.
 */
export async function upsertCenterGoalTargets(db: Db, rows: CenterGoalUpsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const payload = rows.map((r) => ({
    center_id: r.center_id,
    snapshot_date: r.snapshot_date,
    peak_key: r.peak_key,
    goal: r.goal,
    center_name: r.center_name ?? null,
  }))
  const { error } = await db
    .from('center_peak_goals')
    .upsert(payload, { onConflict: 'center_id,snapshot_date,peak_key' })
  if (error) throw new SupabaseUpsertError('center_peak_goals(goal)', error)
  return payload.length
}

/**
 * center_peak_goals 의 current/pct 를 배민 실시간 집계로 upsert (1분 주기).
 * - 비파괴 단조: 같은 (center,date,peak) 에서 새 current 가 기존보다 작으면 스킵(불완전 읽기 방지).
 * - pct = current/goal×100(100 상한). goal 은 기존 행(Looker)에서 읽어 병합. goal 미설정 시 pct=null.
 * - goal 컬럼은 건드리지 않음(Looker 소유). 영업일 바뀌면 새 snapshot_date 로 0 부터 정상 누적.
 */
export async function upsertCenterCurrents(
  db: Db,
  rows: CenterCurrentUpsert[],
  capturedAt: string,
): Promise<number> {
  if (rows.length === 0) return 0
  const centerIds = [...new Set(rows.map((r) => r.center_id))]
  const dates = [...new Set(rows.map((r) => r.snapshot_date))]
  const { data: existing } = await db
    .from('center_peak_goals')
    .select('center_id, snapshot_date, peak_key, current, goal')
    .in('center_id', centerIds)
    .in('snapshot_date', dates)

  const prev = new Map<string, { current: number | null; goal: number | null }>()
  for (const e of existing ?? []) {
    prev.set(`${e.center_id}|${e.snapshot_date}|${e.peak_key}`, {
      current: e.current as number | null,
      goal: e.goal as number | null,
    })
  }

  const payload = rows
    .filter((r) => {
      const p = prev.get(`${r.center_id}|${r.snapshot_date}|${r.peak_key}`)
      return !p || p.current == null || r.current >= p.current // 단조: 증가/동일만
    })
    .map((r) => {
      const goal = prev.get(`${r.center_id}|${r.snapshot_date}|${r.peak_key}`)?.goal ?? null
      const pct = goal != null && goal > 0 ? Math.min(100, Math.round((r.current / goal) * 100)) : null
      return {
        center_id: r.center_id,
        snapshot_date: r.snapshot_date,
        peak_key: r.peak_key,
        current: r.current,
        pct,
        captured_at: capturedAt,
      }
    })
  if (payload.length === 0) return 0

  const { error } = await db
    .from('center_peak_goals')
    .upsert(payload, { onConflict: 'center_id,snapshot_date,peak_key' })
  if (error) throw new SupabaseUpsertError('center_peak_goals(current)', error)
  return payload.length
}
