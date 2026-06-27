/**
 * Supabase service_role 클라이언트 + 멱등 upsert 헬퍼.
 * service_role 키는 RLS 를 우회하므로 스크래퍼(서버) 전용. 노출 금지.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config'
import type { HourlyStatUpsert, RiderUpsert, SlaSnapshotUpsert } from './types'

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
