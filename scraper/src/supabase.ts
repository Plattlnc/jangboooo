/**
 * Supabase service_role 클라이언트 + 멱등 upsert 헬퍼.
 * service_role 키는 RLS 를 우회하므로 스크래퍼(서버) 전용. 노출 금지.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Config } from './config'
import type { CenterCurrentUpsert, CenterGoalUpsert, HourlyStatUpsert, RiderUpsert, SlaSnapshotUpsert } from './types'

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
