/**
 * 한 번의 수집 사이클: 세션 보장 → 배민 delivery-status 수집 → Supabase 멱등 적재.
 * 포털 미설정이면 골격 모드로 스킵, 세션 만료면 '재로그인 필요' 로깅 후 스킵(둘 다 null).
 */
import type { Config } from './config'
import type { Logger } from './logger'
import type { BrowserSession } from './browser'
import type { Db } from './supabase'
import { upsertHourlyStats, upsertRiders, upsertSlaSnapshots } from './supabase'
import { ensureSession, fetchSlaData, isSessionExpired, mockScrapeResult } from './sources/baemin'
import type { ScrapeResult, UpsertCounts } from './types'

export type CycleDeps = {
  cfg: Config
  log: Logger
  db: Db
  session: BrowserSession
}

/** 파싱 결과를 멱등 upsert. captured_at 미지정 행엔 적재 시점을 일괄 부여. */
async function persistResult(db: Db, result: ScrapeResult, log: Logger): Promise<UpsertCounts> {
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
}

/**
 * 단일 사이클 실행. 적재 건수를 반환하고, 스킵(골격/세션만료/mock)이면 그에 맞게 처리.
 * 세션 만료는 무인 복구 불가(SMS 2FA)라 여기서 잡아 로깅+스킵한다.
 * 그 외 예외는 호출부(스케줄러)의 재시도/로깅으로 위임.
 */
export async function runScrapeCycle(deps: CycleDeps): Promise<UpsertCounts | null> {
  const { cfg, log, db, session } = deps

  // MOCK 모드: 배민 미접속, mock 파서 → 적재 파이프라인만 검증(브라우저 불필요).
  if (cfg.mock) {
    log.warn('MOCK 모드 — 가짜 데이터 적재(운영 금지). 배민 미접속.')
    return persistResult(db, mockScrapeResult(cfg), log)
  }

  if (!cfg.portal.configured) {
    log.warn('골격 모드 — ADMIN_PORTAL_URL 미설정, 수집 스킵', { intervalSeconds: cfg.intervalSeconds })
    return null
  }

  const page = await session.newPage()
  try {
    await ensureSession(page, cfg, log)
    return persistResult(db, await fetchSlaData(page, cfg, log), log)
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('재로그인 필요 — 세션 만료로 이번 사이클 스킵', { detail: (err as Error).message })
      return null
    }
    throw err
  } finally {
    await page.close().catch(() => {})
  }
}
