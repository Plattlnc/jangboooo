/**
 * 배민 deliverycenter 어댑터 — 로그인 세션(storageState)으로 SPA 를 띄워
 * SPA 자신이 인증 호출(api-deliverycenter)을 하게 하고, 그 `delivery-status`
 * 응답(JSON)을 가로채 우리 스키마로 매핑한다. 토큰/협력사ID 수작업 불필요.
 *
 * 계약: docs/api/baemin-source.md. 세션은 scripts/capture-session.ts 로 캡처.
 */
import type { Page } from 'playwright'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { dateStringInTz } from '../util'
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

/** 한 페이지 네비 + delivery-status 응답 인터셉트. */
async function fetchPage(page: Page, cfg: Config, pageNum: number, size: number): Promise<DeliveryStatusResponse> {
  const url = `${baseUrl(cfg)}${HISTORY_PATH}?${historyQuery(pageNum, size)}`
  const respPromise = page.waitForResponse(
    (r) => r.url().includes(DELIVERY_STATUS_PATH) && r.request().method() === 'GET',
    { timeout: cfg.navTimeoutMs },
  )
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  assertSession(page)

  let resp
  try {
    resp = await respPromise
  } catch (err) {
    assertSession(page) // 로드 중 로그인으로 튕겼을 수 있음
    throw new Error(`delivery-status 응답 대기 실패(page=${pageNum}): ${(err as Error).message}`)
  }

  const status = resp.status()
  if (status === 401 || status === 403) throw new SessionExpiredError(`HTTP ${status}`)
  if (!resp.ok()) throw new Error(`delivery-status HTTP ${status} (page=${pageNum})`)

  return (await resp.json()) as DeliveryStatusResponse
}

/**
 * 협력사 전체 라이더 배달현황을 수집해 ScrapeResult 로 매핑.
 * size 크게(기본 200) 1콜 시도 → 서버 상한이면 페이지 루프 폴백.
 * 세션 만료 시 SessionExpiredError 를 던진다(호출부에서 스킵 처리).
 */
export async function fetchSlaData(page: Page, cfg: Config, log: Logger): Promise<ScrapeResult> {
  const size = cfg.pageSize
  const first = await fetchPage(page, cfg, 0, size)

  const rows = [...first.data]
  const total = typeof first.total === 'number' ? first.total : rows.length
  const serverSize = first.size && first.size > 0 ? first.size : size
  log.info('delivery-status 1페이지', { requestedSize: size, serverSize, total, got: rows.length })

  // size 상한으로 한 콜에 다 못 받았으면 페이지 루프 폴백.
  if (rows.length < total) {
    const totalPages = first.totalPage && first.totalPage > 0 ? first.totalPage : Math.ceil(total / serverSize)
    log.warn('size 상한 — 페이지 루프 폴백', { serverSize, totalPages })
    for (let p = 1; p < totalPages; p++) {
      const r = await fetchPage(page, cfg, p, serverSize)
      // SPA 가 URL 의 page 쿼리를 무시하면 같은 페이지가 반복됨 → 중복 누적 방지 후 중단.
      if (typeof r.page === 'number' && r.page !== p) {
        log.warn('URL 페이지네이션 미반영 — 1페이지 데이터로 진행', { expected: p, got: r.page })
        break
      }
      rows.push(...r.data)
      if (rows.length >= total) break
    }
  }

  const snapshotDate = dateStringInTz(cfg.timezone)
  const result = mapDeliveryStatus(rows, snapshotDate)
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
  const snapshot_date = dateStringInTz(cfg.timezone)
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
