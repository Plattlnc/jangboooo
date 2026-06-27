/**
 * 한 번의 수집 사이클: 세션 보장 → grider 데이터 수집 → Supabase 멱등 적재.
 * 포털 미설정이면 골격 모드로 스킵(null 반환).
 */
import type { Config } from './config'
import type { Logger } from './logger'
import type { BrowserSession } from './browser'
import type { Db } from './supabase'
import { upsertHourlyStats, upsertRiders, upsertSlaSnapshots } from './supabase'
import { ensureLoggedIn, fetchSlaData } from './sources/grider'
import type { UpsertCounts } from './types'

export type CycleDeps = {
  cfg: Config
  log: Logger
  db: Db
  session: BrowserSession
}

/**
 * 단일 사이클 실행. 적재 건수를 반환하고, 포털 미설정이면 null.
 * 예외는 호출부(스케줄러)의 재시도/로깅으로 위임한다.
 */
export async function runScrapeCycle(deps: CycleDeps): Promise<UpsertCounts | null> {
  const { cfg, log, db, session } = deps

  if (!cfg.portal.configured) {
    log.warn('골격 모드 — ADMIN_PORTAL_* 미설정, 수집 스킵', { intervalSeconds: cfg.intervalSeconds })
    return null
  }

  const page = await session.newPage()
  try {
    await ensureLoggedIn(page, cfg, log)
    await session.persist() // 로그인 직후 세션 영속화

    const result = await fetchSlaData(page, cfg, log)

    // captured_at 미지정 행에 적재 시점을 일괄 부여(신선도 추적).
    const capturedAt = new Date().toISOString()
    const snapshots = result.snapshots.map((s) => ({ captured_at: capturedAt, ...s }))
    const hourly = result.hourly.map((h) => ({ captured_at: capturedAt, ...h }))

    // riders 를 먼저 적재(스냅샷의 FK 대상). 이후 스냅샷/시간 통계.
    const counts: UpsertCounts = {
      riders: await upsertRiders(db, result.riders),
      snapshots: await upsertSlaSnapshots(db, snapshots),
      hourly: await upsertHourlyStats(db, hourly),
    }
    log.info('사이클 완료', counts)
    return counts
  } finally {
    await page.close().catch(() => {})
  }
}
