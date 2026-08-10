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
import { upsertCenterCurrents, upsertHourlyStats, upsertRiderDailyFees, upsertRiders, upsertSlaSnapshots } from './supabase'
import { captureApiHeaders, fetchSlaDataWithHeaders, isSessionExpired, mockScrapeResult } from './sources/baemin'
import { collectDeliveryFees } from './sources/baemin-fees'
import type { RiderDailyFee, ScrapeResult, UpsertCounts } from './types'
import { trustedNow } from './util'

/** trustedNow 기준 KST 달력일(YYYY-MM-DD)+시(0~23). */
function kstDateHour(now: Date): { date: string; hour: number } {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const g = (t: string): string => p.find((x) => x.type === t)?.value ?? ''
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: Number(g('hour')) }
}

/** YYYY-MM-DD 의 전일. */
function prevDay(date: string): string {
  const dt = new Date(`${date}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() - 1)
  return dt.toISOString().slice(0, 10)
}

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
  const capturedAt = trustedNow().toISOString()
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

// ── 배달처리비(세전 수입) 일 1회 수집 — 8시·전일 미수집 시 파킹 세션 재사용 ──
let lastFeeDay: string | null = null // 이 프로세스에서 마지막으로 수집한 전일

/** 재시작 후 중복 다운로드 방지: target 일이 이미 오늘(KST) 적재됐으면 skip. */
async function feesAlreadyCollectedToday(db: Db, target: string, todayKst: string): Promise<boolean> {
  const { data, error } = await db
    .from('rider_daily_fees')
    .select('captured_at')
    .eq('snapshot_date', target)
    .order('captured_at', { ascending: false })
    .limit(1)
  const first = data?.[0]
  if (error || !first) return false
  const capturedKst = kstDateHour(new Date(first.captured_at as string)).date
  return capturedKst === todayKst
}

/** 정확성 교차검증: 배달처리비 완료건수 vs sla_snapshots.completed 불일치 카운트 로깅(정산 전 이상 감지). */
async function reconcileFees(db: Db, day: string, rows: RiderDailyFee[], log: Logger): Promise<void> {
  const { data, error } = await db
    .from('sla_snapshots')
    .select('admin_rider_id, completed')
    .eq('snapshot_date', day)
  if (error || !data) return
  const sla = new Map<string, number>()
  for (const r of data) sla.set(r.admin_rider_id as string, (r.completed as number) ?? 0)
  let mismatch = 0
  let missingInSla = 0
  for (const r of rows) {
    if (!sla.has(r.admin_rider_id)) { missingInSla += 1; continue }
    if (sla.get(r.admin_rider_id) !== r.completed_cnt) mismatch += 1
  }
  if (mismatch > 0 || missingInSla > 0) {
    log.warn('배달처리비 교차검증 불일치(완료건수)', { day, feeRiders: rows.length, mismatch, missingInSla })
  } else {
    log.info('배달처리비 교차검증 일치', { day, riders: rows.length })
  }
}

/** 8시·전일 미수집 시 배달처리비 1회 수집(같은 파킹 세션 page/headers 재사용). 실패해도 SLA 사이클엔 영향 없음. */
async function maybeCollectFees(deps: CycleDeps, api: ApiSession): Promise<void> {
  const { cfg, log, db } = deps
  if (!cfg.fees.configured) return
  const { date: today, hour } = kstDateHour(trustedNow())
  if (hour < cfg.fees.hour) return // 아직 수집 시각(기본 08시) 전
  const target = prevDay(today) // 전일(11일이면 10일)
  if (lastFeeDay === target) return // 이 프로세스에서 이미 수집
  try {
    if (await feesAlreadyCollectedToday(db, target, today)) {
      lastFeeDay = target
      return
    }
    const rows = await collectDeliveryFees(api.page, api.headers, cfg.fees.password!, cfg.fees.reason, target, log)
    if (rows.length === 0) {
      log.warn('배달처리비 0건 — 기존 값 보존(덮어쓰지 않음)', { day: target })
      return // 빈값 가드: lastFeeDay 갱신 안 함 → 다음 사이클 재시도
    }
    const capturedAt = trustedNow().toISOString()
    const withTs = rows.map((r) => ({ ...r, captured_at: capturedAt }))
    const n = await upsertRiderDailyFees(db, withTs)
    lastFeeDay = target
    log.info('배달처리비 적재 완료', { day: target, rows: n })
    await reconcileFees(db, target, rows, log)
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('배달처리비 수집 스킵 — 세션 만료(다음 사이클 재시도)')
      return
    }
    log.error('배달처리비 수집 실패(다음 사이클 재시도)', serializeError(err))
  }
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
    const settled = await persistResult(db, await fetchWithParkedSession(deps), log)
    // 배달처리비: SLA 수집 성공 후 같은 파킹 세션으로 8시·전일 1회 수집(best-effort, SLA 무영향).
    if (apiSession) await maybeCollectFees(deps, apiSession)
    return settled
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('재로그인 필요 — 세션 만료로 이번 사이클 스킵', { detail: (err as Error).message })
      return null
    }
    throw err
  }
}
