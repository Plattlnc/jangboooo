/**
 * 배민 deliverycenter 어댑터 — 로그인 세션(storageState)으로 SPA 를 띄워
 * SPA 자신이 인증 호출(api-deliverycenter)을 하게 하고, 그 `delivery-status`
 * 응답(JSON)을 가로채 우리 스키마로 매핑한다. 토큰/협력사ID 수작업 불필요.
 *
 * 계약: docs/api/baemin-source.md. 세션은 scripts/capture-session.ts 로 캡처.
 */
import type { Page, Request, Response } from 'playwright'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { businessDayInTz } from '../util'
import type { ScrapeResult } from '../types'
import type { DeliveryStatusResponse } from './baemin-types'
import { mapDeliveryStatus } from './baemin-map'

export const DELIVERY_CENTER_URL = 'https://deliverycenter.baemin.com'
const LOGIN_HOST = 'biz-member.baemin.com'
const HISTORY_PATH = '/delivery/history'
const DELIVERY_STATUS_PATH = '/management/delivery-status'

/** 세션 만료(로그인 리다이렉트/401) — 무인 재로그인 불가(SMS 2FA)라 스킵 대상. */
export class SessionExpiredError extends Error {
  constructor(detail: string) {
    super(`세션 만료 — 재로그인 필요: ${detail}`)
    this.name = 'SessionExpiredError'
  }
}

export function isSessionExpired(err: unknown): err is SessionExpiredError {
  return err instanceof SessionExpiredError
}

function baseUrl(cfg: Config): string {
  return cfg.portal.url ?? DELIVERY_CENTER_URL
}

/** 현재 페이지가 로그인 호스트로 튕겼으면 세션 만료. */
function assertSession(page: Page): void {
  if (page.url().includes(LOGIN_HOST)) {
    throw new SessionExpiredError('로그인 페이지로 리다이렉트됨')
  }
}

/**
 * 세션 유효성 확인(데이터 화면 진입 시도). 만료면 SessionExpiredError.
 * fetchSlaData 가 첫 페이지에서 어차피 확인하지만, 명시적 사전 점검도 제공.
 */
export async function ensureSession(page: Page, cfg: Config, log: Logger): Promise<void> {
  await page.goto(`${baseUrl(cfg)}${HISTORY_PATH}`, { waitUntil: 'domcontentloaded' })
  assertSession(page)
  log.debug('세션 유효(데이터 화면 진입)')
}

/** 배달현황 화면 기본 쿼리(실 UI 와 동일하게 빈 필터까지 포함 — SPA 파라미터 파싱 안전). */
function historyQuery(pageNum: number, size: number): string {
  return new URLSearchParams({
    page: String(pageNum),
    size: String(size),
    orderName: 'name',
    orderBy: 'asc',
    name: '',
    userId: '',
    phoneNumber: '',
    riderStatus: '',
  }).toString()
}

const API_BASE = 'https://api-deliverycenter.baemin.com'
const API_PATH = '/v4/management/delivery-status'
// 과거 영업일 백필(라이더별 배달내역). 응답 구조는 delivery-status 와 동일.
const RIDER_HISTORY_PATH = '/v4/management/rider-delivery-status'

/**
 * 데이터 화면을 띄워 SPA 가 발사하는 delivery-status 요청의 헤더(`center-id`+브라우저 헤더)를 캡처.
 * 직접 fetch 는 `center-id` 헤더가 없으면 BAD_REQUEST 라, SPA 요청 헤더를 그대로 재사용한다.
 * SPA 가 호출 자체를 안 하면(스텔스 실패/세션 만료) 에러.
 */
export async function captureApiHeaders(page: Page, cfg: Config, log: Logger): Promise<Record<string, string>> {
  let headers: Record<string, string> | null = null
  const handler = (req: Request) => {
    if (!headers && req.url().includes(DELIVERY_STATUS_PATH) && req.method() === 'GET') {
      headers = req.headers()
    }
  }
  // 진단: SPA 자신의 delivery-status 응답 상태를 로깅 — 200이면 세션 유효(우리 replay가 문제),
  //       403이면 세션/계정/API 자체가 거부(브라우저로도 안 됨).
  const resHandler = (res: Response): void => {
    if (res.url().includes(DELIVERY_STATUS_PATH)) {
      log.info('SPA delivery-status 응답(진단)', { status: res.status(), url: res.url().slice(0, 80) })
    }
  }
  page.on('request', handler)
  page.on('response', resHandler)
  try {
    await page.goto(`${baseUrl(cfg)}${HISTORY_PATH}`, { waitUntil: 'networkidle' })
    assertSession(page)
    for (let i = 0; i < 30 && !headers; i++) await page.waitForTimeout(500)
  } finally {
    page.off('request', handler)
    page.off('response', resHandler)
  }
  if (!headers) {
    assertSession(page)
    throw new Error('delivery-status 요청 미발생 — SPA 가 API 미호출(스텔스/세션 점검 필요)')
  }
  return headers
}

// 재전송 금지 헤더(컨텍스트/전송계층이 자체 설정 — 재사용 시 충돌/거부 유발).
const DROP_HEADERS = new Set([
  'host',
  'cookie',
  'content-length',
  'connection',
  'accept-encoding',
])

/** 캡처한 SPA 헤더에서 안전 재전송분만 추림(center-id·authorization·origin·referer 등 유지). */
function pickReplayHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    const key = k.toLowerCase()
    if (key.startsWith(':') || DROP_HEADERS.has(key)) continue // HTTP/2 pseudo + 전송계층 헤더 제외
    out[k] = v
  }
  return out
}

/**
 * 캡처한 헤더로 api-deliverycenter 직접 호출.
 * Playwright 네이티브 page.request 사용 — 컨텍스트 쿠키 자동 포함 + 페이지 SPA 의 fetch 래퍼/브라우저
 * CORS 우회. (구: page.evaluate(fetch) 는 SPA 가 monkey-patch 한 window.fetch 를 타 "Failed to fetch"
 * 네트워크 예외로 크래시 → 상태코드 분류 불가. 2026-06-30 교체.)
 * 네트워크 자체 실패는 명확한 에러로 변환(스케줄러가 사이클 실패로 카운트, raw TypeError 누수 방지).
 */
async function apiGet(
  page: Page,
  headers: Record<string, string>,
  url: string,
  label: string,
): Promise<DeliveryStatusResponse> {
  let status: number
  let raw = ''
  try {
    const res = await page.request.get(url, { headers: pickReplayHeaders(headers) })
    status = res.status()
    raw = await res.text()
  } catch (e) {
    // DNS/연결거부/타임아웃/차단 등 전송계층 실패 — 상태코드 없음.
    throw new Error(`${label} 네트워크 실패(전송계층): ${(e as Error).message}`)
  }
  // 진단: 실패 시 응답 본문 스니펫을 에러 메시지에 실어 로그로 노출(403 원인 파악).
  if (status < 200 || status >= 300) {
    const snippet = raw.slice(0, 400).replace(/\s+/g, ' ').trim()
    if (status === 401 || status === 403) throw new SessionExpiredError(`HTTP ${status} body=${snippet}`)
    throw new Error(`${label} HTTP ${status} body=${snippet}`)
  }
  let body: unknown = null
  try {
    body = JSON.parse(raw)
  } catch {
    /* 비 JSON */
  }
  return body as DeliveryStatusResponse
}

/** 오늘 배달현황 한 페이지(delivery-status). */
async function fetchPage(
  page: Page,
  headers: Record<string, string>,
  pageNum: number,
  size: number,
): Promise<DeliveryStatusResponse> {
  return apiGet(page, headers, `${API_BASE}${API_PATH}?${historyQuery(pageNum, size)}`, `delivery-status(page=${pageNum})`)
}

/**
 * 과거 영업일 1일치 라이더별 배달내역(rider-delivery-status, fromDate=toDate=day).
 * 응답 구조는 delivery-status 와 동일 → mapDeliveryStatus 재사용(snapshot_date=day).
 */
export async function fetchHistoryDay(
  page: Page,
  headers: Record<string, string>,
  cfg: Config,
  log: Logger,
  day: string,
): Promise<ScrapeResult> {
  const size = cfg.pageSize
  const q = new URLSearchParams({ page: '0', size: String(size), fromDate: day, toDate: day }).toString()
  const first = await apiGet(page, headers, `${API_BASE}${RIDER_HISTORY_PATH}?${q}`, `rider-delivery-status(${day})`)
  const rows = [...first.data]
  const total = typeof first.total === 'number' ? first.total : rows.length
  const serverSize = first.size && first.size > 0 ? first.size : size
  if (rows.length < total) {
    const totalPages = first.totalPage && first.totalPage > 0 ? first.totalPage : Math.ceil(total / serverSize)
    for (let p = 1; p < totalPages; p++) {
      const pq = new URLSearchParams({ page: String(p), size: String(serverSize), fromDate: day, toDate: day }).toString()
      const r = await apiGet(page, headers, `${API_BASE}${RIDER_HISTORY_PATH}?${pq}`, `rider-delivery-status(${day},p=${p})`)
      if (typeof r.page === 'number' && r.page !== p) break
      rows.push(...r.data)
      if (rows.length >= total) break
    }
  }
  const result = mapDeliveryStatus(rows, day, headers['center-id'] ?? null)
  log.info('과거 백필 1일', { day, total, riders: result.riders.length, snapshots: result.snapshots.length })
  return result
}

/**
 * 협력사 전체 라이더 배달현황을 수집해 ScrapeResult 로 매핑.
 * size 크게(기본 200) 1콜 시도 → 서버 상한이면 페이지 루프 폴백.
 * 세션 만료 시 SessionExpiredError 를 던진다(호출부에서 스킵 처리).
 */
export async function fetchSlaData(page: Page, cfg: Config, log: Logger): Promise<ScrapeResult> {
  const headers = await captureApiHeaders(page, cfg, log)
  const size = cfg.pageSize
  const first = await fetchPage(page, headers, 0, size)

  const rows = [...first.data]
  const total = typeof first.total === 'number' ? first.total : rows.length
  const serverSize = first.size && first.size > 0 ? first.size : size
  log.info('delivery-status 1페이지', { requestedSize: size, serverSize, total, got: rows.length })

  // size 상한으로 한 콜에 다 못 받았으면 페이지 루프 폴백(직접 API 는 page/size 를 정상 반영).
  if (rows.length < total) {
    const totalPages = first.totalPage && first.totalPage > 0 ? first.totalPage : Math.ceil(total / serverSize)
    log.warn('size 상한 — 페이지 루프 폴백', { serverSize, totalPages })
    for (let p = 1; p < totalPages; p++) {
      const r = await fetchPage(page, headers, p, serverSize)
      if (typeof r.page === 'number' && r.page !== p) {
        log.warn('페이지네이션 미반영 — 누적 중단', { expected: p, got: r.page })
        break
      }
      rows.push(...r.data)
      if (rows.length >= total) break
    }
  }

  const snapshotDate = businessDayInTz(cfg.timezone)
  const result = mapDeliveryStatus(rows, snapshotDate, headers['center-id'] ?? null)
  log.info('배민 수집 완료', {
    snapshotDate,
    total,
    riders: result.riders.length,
    snapshots: result.snapshots.length,
    hourly: result.hourly.length,
  })
  return result
}

/**
 * 적재 파이프라인 검증용 결정적 mock(SCRAPE_MOCK=true). 배민 미접속.
 * ⚠️ 운영 금지 — admin_rider_id 는 'MOCK-' 접두로 식별/정리 용이.
 */
export function mockScrapeResult(cfg: Config): ScrapeResult {
  const snapshot_date = businessDayInTz(cfg.timezone)
  return {
    riders: [
      { admin_rider_id: 'MOCK-0001', name: '모의 라이더 1', phone: '010-0000-0001', is_active: true },
      { admin_rider_id: 'MOCK-0002', name: '모의 라이더 2', phone: '010-0000-0002', is_active: true },
    ],
    snapshots: [
      { admin_rider_id: 'MOCK-0001', snapshot_date, sla_score: null, completed: 48, rejected: 2, dispatch_canceled: 1, delivery_canceled: 0, assigned: 51, acceptance_rate: 94.12 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, sla_score: null, completed: 33, rejected: 5, dispatch_canceled: 2, delivery_canceled: 1, assigned: 41, acceptance_rate: 82.5 },
    ],
    hourly: [
      { admin_rider_id: 'MOCK-0001', snapshot_date, hour: 12, completed: 9 },
      { admin_rider_id: 'MOCK-0001', snapshot_date, hour: 18, completed: 14 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, hour: 12, completed: 7 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, hour: 19, completed: 11 },
    ],
  }
}
