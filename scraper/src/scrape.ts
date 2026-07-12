/**
 * 한 번의 수집 사이클: 세션 보장 → 배민 delivery-status 수집 → Supabase 멱등 적재.
 * 포털 미설정이면 골격 모드로 스킵, 세션 만료면 '재로그인 필요' 로깅 후 스킵(둘 다 null).
 */
import type { Page } from 'playwright'
import type { Config } from './config'
import type { Logger } from './logger'
import { serializeError } from './logger'
import type { BrowserSession } from './browser'
import type { Db } from './supabase'
import { upsertCenterCurrents, upsertHourlyStats, upsertRiders, upsertSlaSnapshots } from './supabase'
import { captureApiHeaders, fetchSlaDataWithHeaders, isSessionExpired, mockScrapeResult } from './sources/baemin'
import type { ScrapeResult, UpsertCounts } from './types'

export type CycleDeps = {
  cfg: Config
  log: Logger
  db: Db
  session: BrowserSession
}

/**
 * 파킹 API 세션 — SPA 풀로드(captureApiHeaders 의 goto)가 프록시 트래픽의 대부분(사이클당 ~1MB,
 * 2026-07-11 5GB/3일 소진 원인)이라, 페이지·헤더를 사이클 간 재사용하고 JSON API 만 재호출한다.
 * MAX_CYCLES 마다 재진입해 SPA 장수 페이지의 메모리/토큰 노화를 막는다. 워커는 단일 프로세스라
 * 모듈 싱글턴으로 충분. 브라우저 재기동 시엔 page.isClosed() 로 감지해 재획득한다.
 */
const API_SESSION_MAX_CYCLES = 60
type ApiSession = { page: Page; headers: Record<string, string>; cycles: number }
let apiSession: ApiSession | null = null

async function dropApiSession(): Promise<void> {
  const s = apiSession
  apiSession = null
  if (s) await s.page.close().catch(() => {})
}

async function acquireApiSession(deps: CycleDeps): Promise<ApiSession> {
  if (apiSession && !apiSession.page.isClosed() && apiSession.cycles < API_SESSION_MAX_CYCLES) {
    return apiSession
  }
  await dropApiSession()
  const page = await deps.session.newPage()
  try {
    const headers = await captureApiHeaders(page, deps.cfg, deps.log)
    apiSession = { page, headers, cycles: 0 }
    return apiSession
  } catch (err) {
    await page.close().catch(() => {})
    throw err
  }
}

/**
 * 파킹 세션으로 수집. 재사용 세션 실패는 헤더 노화일 수 있어(진짜 로그인 만료와 구분 불가)
 * 같은 사이클 안에서 재캡처 1회 재시도 — 재캡처(goto+assertSession)까지 실패해야 진짜 에러.
 */
async function fetchWithParkedSession(deps: CycleDeps): Promise<ScrapeResult> {
  const { cfg, log } = deps
  const api = await acquireApiSession(deps)
  const isFresh = api.cycles === 0
  try {
    const result = await fetchSlaDataWithHeaders(api.page, api.headers, cfg, log)
    api.cycles += 1
    return result
  } catch (err) {
    await dropApiSession()
    if (isFresh) throw err
    log.warn('파킹 API 세션 실패 — 재캡처 후 재시도', serializeError(err))
    const fresh = await acquireApiSession(deps)
    try {
      const result = await fetchSlaDataWithHeaders(fresh.page, fresh.headers, cfg, log)
      fresh.cycles += 1
      return result
    } catch (err2) {
      await dropApiSession()
      throw err2
    }
  }
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
  // 공동목표 current 를 배민 실시간 집계로 갱신(goal 은 Looker 가 별도 소유).
  if (result.centerPeakCurrents?.length) {
    counts.centerCurrents = await upsertCenterCurrents(db, result.centerPeakCurrents, capturedAt)
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
  const { cfg, log, db } = deps

  // MOCK 모드: 배민 미접속, mock 파서 → 적재 파이프라인만 검증(브라우저 불필요).
  if (cfg.mock) {
    log.warn('MOCK 모드 — 가짜 데이터 적재(운영 금지). 배민 미접속.')
    return persistResult(db, mockScrapeResult(cfg), log)
  }

  if (!cfg.portal.configured) {
    log.warn('골격 모드 — ADMIN_PORTAL_URL 미설정, 수집 스킵', { intervalSeconds: cfg.intervalSeconds })
    return null
  }

  try {
    return persistResult(db, await fetchWithParkedSession(deps), log)
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('재로그인 필요 — 세션 만료로 이번 사이클 스킵', { detail: (err as Error).message })
      return null
    }
    throw err
  }
}
