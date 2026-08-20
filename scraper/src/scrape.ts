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
import { upsertCenterCurrents, upsertDeliveryFeeDetails, upsertHourlyStats, upsertInsurance, upsertRiderContractStatus, upsertRiderDailyFees, upsertRiderExtraPayments, upsertRiderWeeklyInsurance, upsertRiders, upsertSlaSnapshots, upsertWeeklyRevenue, upsertWeeklyTaxInvoice, upsertWorkingStatus } from './supabase'
import { captureApiHeaders, fetchSlaDataWithHeaders, isSessionExpired, mockScrapeResult } from './sources/baemin'
import { collectDeliveryFees } from './sources/baemin-fees'
import { tryCollectGriderRiders, tryCollectGriderWeekly } from './sources/grider'
import type { RiderDailyFee, ScrapeResult, UpsertCounts } from './types'
import { isBusinessDayRollover, trustedNow } from './util'

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

function addDays(date: string, n: number): string {
  const dt = new Date(`${date}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/**
 * 오늘(KST) 기준 '가장 최근 완결된 정산 주(수~화)'. 주 시작=수요일, 끝=화요일.
 * grider 주정산서는 화요일 마감 후 발행되므로, 이번 주 화요일이 아직 안 지났으면 지난 주를 반환.
 */
function lastCompletedSettlementWeek(today: string): { start: string; end: string } {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay() // 0=일 … 3=수 … 2=화
  // 이번 주 수요일(주 시작) 오프셋: 수=0, 목=-1, … 화=-6.
  const sinceWed = (dow - 3 + 7) % 7
  const thisWeekStart = addDays(today, -sinceWed)
  // 완결 주 = 지난 주(이번 주는 아직 진행 중이거나 방금 끝나 발행 전일 수 있음).
  const start = addDays(thisWeekStart, -7)
  return { start, end: addDays(start, 6) }
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
// 세션 만료 연속 카운트 — warn 에 묻혀 공백이 길어지지 않게 임계 초과 시 error 로 승격.
let consecutiveSessionExpiries = 0
const SESSION_EXPIRY_ALERT_THRESHOLD = 5
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
async function persistResult(db: Db, result: ScrapeResult, log: Logger, timezone = 'Asia/Seoul'): Promise<UpsertCounts> {
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
  // 영업일 전환(06:00) 직후 그레이스 구간엔 스킵 — 배민 카운터 리셋 전의 전일 누적치가
  // 새 날짜에 시드되면 단조 가드가 실값 갱신을 하루 종일 차단한다(2026-08-14 사고).
  if (result.centerPeakCurrents?.length) {
    if (isBusinessDayRollover(timezone)) {
      log.info('영업일 전환 그레이스 — 피크 current 적재 스킵(전일 누적 오염 방지)')
    } else {
      counts.centerCurrents = await upsertCenterCurrents(db, result.centerPeakCurrents, capturedAt)
    }
  }
  // 실시간 근무 인원(Storage) — best-effort, 실패해도 SLA 사이클 무영향.
  if (result.workingStatus) {
    try {
      await upsertWorkingStatus(db, result.workingStatus, capturedAt)
      counts.working = result.workingStatus.working
    } catch (err) {
      log.warn('근무 인원 적재 실패(무시)', serializeError(err))
    }
  }
  log.info('사이클 완료', counts)
  return counts
}

// ── 배달처리비(세전 수입) 일 1회 수집 — 8시·전일 미수집 시 파킹 세션 재사용 ──
let lastFeeDay: string | null = null // 이 프로세스에서 마지막으로 수집한 전일
let lastFeeSweepDay: string | null = null // 미수집일 소급 스윕을 완주한 날(KST)
// 실패 시 백오프 — 매 사이클(60s) 재시도로 배민에 4xx 폭주 방지(2026-08-20 배민 신정책 '전날 데이터는 익일 11시 이후'
// 발견 계기. 실패 유형 무관 최소 15분 간격으로 재시도).
let lastFeeAttemptAtMs: number | null = null
const FEE_RETRY_MIN_GAP_MS = 15 * 60 * 1000

/** 배민 신정책 응답 감지 — 전날 데이터를 지정 시각 이전에 요청 시 반환하는 BAD_REQUEST 문구. */
function isFeeEarlyMorningError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return /오전 11시 이후|아직 조회할 수 없/.test(err.message)
}

/** 소급 대상: 그제~lookback일 중 rider_daily_fees 에 행이 하나도 없는 영업일(과거 세션 다운 구간). */
async function missingOlderFeeDays(db: Db, today: string, lookback: number): Promise<string[]> {
  const missing: string[] = []
  let day = prevDay(prevDay(today)) // 그제부터(어제는 기본 수집 경로 담당)
  for (let i = 0; i < lookback; i++) {
    const { data, error } = await db
      .from('rider_daily_fees')
      .select('snapshot_date')
      .eq('snapshot_date', day)
      .limit(1)
    if (error) return [] // 판단 불가면 이번 사이클 스킵(다음 사이클 재시도)
    if (!data?.length) missing.push(day)
    day = prevDay(day)
  }
  return missing.reverse() // 과거→최근 순으로 수집
}

/**
 * 배달처리비 미수집일 자동 소급 — 세션 다운 등으로 하루 놓치면 종전엔 영구 공백이었다
 * (기본 경로는 '어제'만 노림). 08시 이후 하루 1회, 그제~7일 전 중 빈 날을 내려받아 채운다.
 * 사이클당 최대 2일(다운로드 규제·사이클 예산 고려) — 남은 날은 다음 사이클이 이어서 처리.
 */
async function maybeBackfillMissedFees(deps: CycleDeps, api: ApiSession): Promise<void> {
  const { cfg, log, db } = deps
  if (!cfg.fees.configured) return
  const { date: today, hour } = kstDateHour(trustedNow())
  if (hour < cfg.fees.hour) return
  if (lastFeeSweepDay === today) return // 오늘 스윕 완주함
  try {
    const missing = await missingOlderFeeDays(db, today, 7)
    if (missing.length === 0) {
      lastFeeSweepDay = today
      return
    }
    log.warn('배달처리비 미수집일 발견 — 자동 소급 시작', { missing })
    for (const day of missing.slice(0, 2)) {
      const parsed = await collectDeliveryFees(api.page, api.headers, cfg.fees.password!, cfg.fees.reason, day, log)
      if (parsed.daily.length === 0) {
        // 과거일이 진짜 0건(전면 미운행)일 수 있어 완료로 간주 — 실제 데이터가 있었다면 수동 backfill 경로가 남아있다.
        log.warn('배달처리비 소급 0건 — 해당 일은 데이터 없음으로 간주', { day })
        continue
      }
      const capturedAt = trustedNow().toISOString()
      const n = await upsertRiderDailyFees(db, parsed.daily.map((r) => ({ ...r, captured_at: capturedAt })))
      const nd = await upsertDeliveryFeeDetails(db, parsed.details.map((r) => ({ ...r, captured_at: capturedAt })))
      log.info('배달처리비 소급 적재 완료', { day, daily: n, details: nd })
      await reconcileFees(db, day, parsed.daily, log)
    }
    if (missing.length <= 2) lastFeeSweepDay = today // 전부 처리했을 때만 완주 마킹
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('배달처리비 소급 스킵 — 세션 만료(다음 사이클 재시도)')
      return
    }
    log.error('배달처리비 소급 실패(다음 사이클 재시도)', serializeError(err))
  }
}

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

/** DB 적재분 기준 교차검증 — 재시작 후 '이미 수집됨' 경로에서도 정합 경고가 남도록. */
async function reconcileFeesFromDb(db: Db, day: string, log: Logger): Promise<void> {
  const { data, error } = await db
    .from('rider_daily_fees')
    .select('admin_rider_id, completed_cnt')
    .eq('snapshot_date', day)
  if (error || !data?.length) return
  await reconcileFees(
    db,
    day,
    data.map((r) => ({ admin_rider_id: r.admin_rider_id, completed_cnt: r.completed_cnt }) as RiderDailyFee),
    log,
  )
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

/** 배민 신정책(11시) 등 실패 후 매 사이클 재시도로 폭주하지 않도록 최소 15분 간격 백오프. */
function feeRetryTooSoon(now: Date): boolean {
  if (lastFeeAttemptAtMs == null) return false
  return now.getTime() - lastFeeAttemptAtMs < FEE_RETRY_MIN_GAP_MS
}

/** 8시·전일 미수집 시 배달처리비 1회 수집(같은 파킹 세션 page/headers 재사용). 실패해도 SLA 사이클엔 영향 없음. */
async function maybeCollectFees(deps: CycleDeps, api: ApiSession): Promise<void> {
  const { cfg, log, db } = deps
  if (!cfg.fees.configured) return
  const now = trustedNow()
  const { date: today, hour } = kstDateHour(now)
  if (hour < cfg.fees.hour) return // 아직 수집 시각(기본 08시) 전
  const target = prevDay(today) // 전일(11일이면 10일)
  if (lastFeeDay === target) return // 이 프로세스에서 이미 수집
  if (feeRetryTooSoon(now)) return // 실패 백오프(최소 15분 간격)
  lastFeeAttemptAtMs = now.getTime()
  try {
    if (await feesAlreadyCollectedToday(db, target, today)) {
      lastFeeDay = target
      await reconcileFeesFromDb(db, target, log) // 재시작 낀 날도 정합 경고는 남긴다
      return
    }
    const parsed = await collectDeliveryFees(api.page, api.headers, cfg.fees.password!, cfg.fees.reason, target, log)
    if (parsed.daily.length === 0) {
      log.warn('배달처리비 0건 — 기존 값 보존(덮어쓰지 않음)', { day: target })
      return // 빈값 가드: lastFeeDay 갱신 안 함 → 15분 뒤 재시도
    }
    const capturedAt = trustedNow().toISOString()
    const n = await upsertRiderDailyFees(db, parsed.daily.map((r) => ({ ...r, captured_at: capturedAt })))
    const nd = await upsertDeliveryFeeDetails(db, parsed.details.map((r) => ({ ...r, captured_at: capturedAt })))
    // 시간제보험료(있으면) Storage 적재 — best-effort, 실패해도 배달처리비 적재엔 영향 없음.
    let ni = 0
    if (parsed.insurance.length) {
      try {
        ni = await upsertInsurance(db, parsed.insurance)
      } catch (e) {
        log.warn('시간제보험료 적재 실패(무시)', serializeError(e))
      }
    }
    lastFeeDay = target
    log.info('배달처리비 적재 완료', { day: target, daily: n, details: nd, insurance: ni })
    await reconcileFees(db, target, parsed.daily, log)
  } catch (err) {
    if (isSessionExpired(err)) {
      log.warn('배달처리비 수집 스킵 — 세션 만료(15분 뒤 재시도)')
      return
    }
    if (isFeeEarlyMorningError(err)) {
      // 배민 신정책(2026-08-20 확인): 전날 데이터는 익일 11시 이후만 조회. 11시 전 요청은 info 로 조용히 대기.
      // 근본 예방책은 Railway env DELIVERY_FEE_HOUR=11 상향(코드 기본값과 무관). 이 분류는 만일 배민 시각이
      // 미세하게 밀리거나 env 롤백 시에도 로그가 error 로 튀지 않게 하는 안전장치.
      log.info('배달처리비 수집 대기 — 배민 정책(전날 데이터 11시 이후)', { day: target })
      return
    }
    log.error('배달처리비 수집 실패(15분 뒤 재시도)', serializeError(err))
  }
}

// ── grider 주정산서(추가지급·시간제보험료) 주 1회 자동 수집 ──
let griderDoneWeek: string | null = null // 이 프로세스에서 마지막으로 적재 완료한 주(week_start)
let griderLastAttemptDay: string | null = null // 오늘(KST) 시도했는지 — 하루 1회로 제한

/** 최근 완결 주(수~화)가 rider_weekly_insurance 에 이미 있으면 skip(재시작 중복 방지). */
async function griderWeekAlreadyStored(db: Db, weekStart: string): Promise<boolean> {
  const { data, error } = await db
    .from('rider_weekly_insurance')
    .select('week_start')
    .eq('week_start', weekStart)
    .limit(1)
  if (error) return false
  return Boolean(data?.length)
}

/**
 * grider 주정산서 수집 — GRIDER_HOUR(기본 9시) 이후 하루 1회 시도, 최근 완결 주(수~화)를
 * 아직 안 받았으면 로그인→다운로드→파싱→멱등 upsert. 2FA 없어 재로그인 저렴. best-effort.
 */
async function maybeCollectGriderWeekly(cfg: Config, db: Db, log: Logger): Promise<void> {
  if (!cfg.grider.configured) return
  const { date: today, hour } = kstDateHour(trustedNow())
  if (hour < cfg.grider.hour) return
  const week = lastCompletedSettlementWeek(today)
  if (griderDoneWeek === week.start) return // 이 프로세스에서 이미 적재
  if (griderLastAttemptDay === today) return // 오늘 이미 시도(성공/실패 무관 — 하루 1회)
  griderLastAttemptDay = today
  try {
    if (await griderWeekAlreadyStored(db, week.start)) {
      griderDoneWeek = week.start
      return
    }
    const res = await tryCollectGriderWeekly(cfg, log, week.start, week.end)
    if (!res) return // 로그인 실패/미발행 등 — 내일 재시도
    if (res.insurance.length === 0 && res.extra.length === 0 && !res.revenue) {
      log.warn('grider 주정산서 0건 — 미발행 가능(내일 재시도)', { week: week.start })
      return
    }
    const ni = await upsertRiderWeeklyInsurance(db, res.insurance)
    const ne = await upsertRiderExtraPayments(db, res.extra)
    const nr = await upsertWeeklyRevenue(db, res.revenue)
    const nt = await upsertWeeklyTaxInvoice(db, res.taxInvoice)
    griderDoneWeek = week.start
    log.info('grider 주정산서 적재 완료', { week: `${week.start}~${week.end}`, insurance: ni, extra: ne, revenue: nr, tax: nt })
  } catch (err) {
    log.error('grider 주정산서 수집 실패(내일 재시도)', serializeError(err))
  }
}

// ── grider 라이더 계약상태(계약중/계약종료) 주 X 하루 1회 수집 → '계약종료' 뱃지 소스 ──
let griderRidersDay: string | null = null

async function maybeCollectGriderRiders(cfg: Config, db: Db, log: Logger): Promise<void> {
  if (!cfg.grider.configured) return
  const { date: today, hour } = kstDateHour(trustedNow())
  if (hour < cfg.grider.hour) return
  if (griderRidersDay === today) return
  griderRidersDay = today // 하루 1회(실패해도 내일 재시도 — 계약상태는 완만히 변함)
  try {
    const riders = await tryCollectGriderRiders(cfg, log)
    if (!riders || riders.length === 0) return
    const n = await upsertRiderContractStatus(db, riders)
    log.info('grider 계약상태 적재 완료', { total: n, terminated: riders.filter((r) => r.is_terminated).length })
  } catch (err) {
    log.error('grider 계약상태 적재 실패(내일 재시도)', serializeError(err))
  }
}

// ── app_visits retention — 하루 1회, 90일 초과 로그 삭제 ──
// 소비처(get_app_usage)는 최근 14일만 읽는데 적재는 무한이라 데드 웨이트만 쌓인다(0017).
// 90일 보존이면 재집계 여지까지 넉넉. best-effort — 실패해도 사이클 무영향.
let lastVisitPruneDay: string | null = null

async function maybePruneAppVisits(db: Db, log: Logger): Promise<void> {
  const { date: today } = kstDateHour(trustedNow())
  if (lastVisitPruneDay === today) return
  try {
    const cutoff = new Date(trustedNow().getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { error, count } = await db
      .from('app_visits')
      .delete({ count: 'exact' })
      .lt('visited_at', cutoff)
    if (error) throw error
    lastVisitPruneDay = today
    if (count) log.info('app_visits retention 정리', { deleted: count, cutoff })
  } catch (err) {
    log.warn('app_visits retention 실패(무시, 내일 재시도)', serializeError(err))
    lastVisitPruneDay = today // 실패해도 하루 1회만 시도(로그 소음 방지)
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
    return persistResult(db, mockScrapeResult(cfg), log, cfg.timezone)
  }

  if (!cfg.portal.configured) {
    log.warn('골격 모드 — ADMIN_PORTAL_URL 미설정, 수집 스킵', { intervalSeconds: cfg.intervalSeconds })
    return null
  }

  try {
    const settled = await persistResult(db, await fetchWithParkedSession(deps), log, cfg.timezone)
    consecutiveSessionExpiries = 0
    // 배달처리비: SLA 수집 성공 후 같은 파킹 세션으로 8시·전일 1회 수집(best-effort, SLA 무영향).
    if (apiSession) await maybeCollectFees(deps, apiSession)
    // 과거 미수집일 자동 소급(하루 1회 스윕) — 세션 다운으로 놓친 날의 영구 공백 방지.
    if (apiSession) await maybeBackfillMissedFees(deps, apiSession)
    // grider 주정산서(추가지급·시간제보험료) 주 1회 자동 수집 — 배민 세션과 독립.
    await maybeCollectGriderWeekly(cfg, db, log)
    // grider 라이더 계약상태(계약종료 뱃지) 하루 1회.
    await maybeCollectGriderRiders(cfg, db, log)
    await maybePruneAppVisits(db, log)
    return settled
  } catch (err) {
    if (isSessionExpired(err)) {
      consecutiveSessionExpiries += 1
      if (consecutiveSessionExpiries >= SESSION_EXPIRY_ALERT_THRESHOLD) {
        log.error('세션 만료 지속 — 재캡처 필요(npm run capture → STORAGE_STATE_B64 갱신)', {
          consecutive: consecutiveSessionExpiries,
          detail: (err as Error).message,
        })
      } else {
        log.warn('재로그인 필요 — 세션 만료로 이번 사이클 스킵', { detail: (err as Error).message })
      }
      return null
    }
    throw err
  }
}
