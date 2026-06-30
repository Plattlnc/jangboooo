/**
 * Supabase service_role 클라이언트 + 멱등 upsert 헬퍼.
 * service_role 키는 RLS 를 우회하므로 스크래퍼(서버) 전용. 노출 금지.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config'
import type { CenterGoalUpsert, HourlyStatUpsert, RiderUpsert, SlaSnapshotUpsert } from './types'

export type Db = SupabaseClient

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

/** sla_snapshots 멱등 upsert (키: admin_rider_id, snapshot_date). */
export async function upsertSlaSnapshots(db: Db, rows: SlaSnapshotUpsert[]): Promise<number> {
  if (rows.length === 0) return 0
  const { error } = await db.from('sla_snapshots').upsert(rows, { onConflict: 'admin_rider_id,snapshot_date' })
  if (error) throw new SupabaseUpsertError('sla_snapshots', error)
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
 * center_peak_goals 멱등 upsert (키: center_id, snapshot_date, peak_key).
 *
 * 비파괴 단조(non-decreasing) 가드: 같은 영업일·피크에서 current(누적 완료)는 줄어들 수 없다.
 * Looker 리포트를 덜 읽어 current=0 인 불완전 스크랩이 기존 정상값을 0 으로 덮어쓰는 회귀
 * (UI 가 간헐적으로 "전부 0" 으로 깜빡임)를 막는다. 새 current 가 기존보다 작으면 그 행은 스킵.
 * 영업일이 바뀌면 snapshot_date 가 달라 새 행으로 0 부터 정상 시작(가드 영향 없음).
 */
export async function upsertCenterPeakGoals(db: Db, rows: CenterGoalUpsert[]): Promise<number> {
  if (rows.length === 0) return 0

  const centerIds = [...new Set(rows.map((r) => r.center_id))]
  const dates = [...new Set(rows.map((r) => r.snapshot_date))]
  const { data: existing } = await db
    .from('center_peak_goals')
    .select('center_id, snapshot_date, peak_key, current')
    .in('center_id', centerIds)
    .in('snapshot_date', dates)

  const prevCurrent = new Map<string, number | null>()
  for (const e of existing ?? []) {
    prevCurrent.set(`${e.center_id}|${e.snapshot_date}|${e.peak_key}`, e.current as number | null)
  }

  const accepted = rows.filter((r) => {
    const prev = prevCurrent.get(`${r.center_id}|${r.snapshot_date}|${r.peak_key}`)
    if (prev == null) return true // 기존 없음/null → 채택
    if (r.current == null) return false // 새 값 null → 기존 보존
    return r.current >= prev // 증가/동일만 채택, 감소(불완전 스크랩)는 스킵
  })
  if (accepted.length === 0) return 0

  const { error } = await db
    .from('center_peak_goals')
    .upsert(accepted, { onConflict: 'center_id,snapshot_date,peak_key' })
  if (error) throw new SupabaseUpsertError('center_peak_goals', error)
  return accepted.length
}
