/**
 * grider(관리자 포털) 사이트 어댑터 — 로그인 + 데이터 파싱.
 *
 * 소스 확정: https://jangboo.grider.ai/dashboard — PHP 서버렌더 앱
 *   (`/` → 302 → `/index.php`, 세션쿠키 기반, SPA 아님).
 *   즉 폼 로그인 → 세션 유지 → 서버렌더 HTML 테이블 파싱.
 *
 * ⚠️ 실제 로그인 폼/SLA 테이블 마크업(= 인증 샘플) 도착 전까지 셀렉터와
 *    파서는 채울 수 없다. 아래 TODO(selector) 지점이 backend 와 공동으로
 *    채울 영역이다. 그 전에는 NotImplementedError 를 던져 사이클이 골격
 *    모드로 안전하게 스킵된다. 파이프라인(적재) 검증은 SCRAPE_MOCK=true 의
 *    mockScrapeResult() 로 수행한다.
 *
 * 적재 매핑(확정): supabase/migrations/0001_core_schema.sql 의
 *   sla_snapshots(완료/거절/배차취소/배달취소/배차/SLA점수/수락률),
 *   rider_hourly_stats(시간×완료) 컬럼에 1:1 대응 (src/types.ts).
 */
import type { Page } from 'playwright'
import type { Config } from '../config'
import type { Logger } from '../logger'
import { dateStringInTz } from '../util'
import type { ScrapeResult } from '../types'

/** 확정된 소스 시스템 URL. ADMIN_PORTAL_URL 의 기본/예시 값. */
export const GRIDER_DASHBOARD_URL = 'https://jangboo.grider.ai/dashboard'

/** 재시도해도 의미 없는 "미구현" 표식 — retry 가 즉시 중단하도록 분기에 사용. */
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`미구현(인증 샘플 대기): ${what}`)
    this.name = 'NotImplementedError'
  }
}

export function isNotImplemented(err: unknown): err is NotImplementedError {
  return err instanceof NotImplementedError
}

/**
 * 현재 컨텍스트가 로그인 상태인지 판정.
 * TODO(selector): 인증 샘플 필요 — 로그인 시에만 보이는 요소/URL 로 판정.
 */
export async function isLoggedIn(_page: Page, _cfg: Config): Promise<boolean> {
  // TODO(selector): 인증 샘플 필요 — 예) 대시보드 헤더/로그아웃 버튼/세션쿠키 존재.
  return false
}

/**
 * 필요 시 로그인 수행(이미 로그인 상태면 no-op). 성공 시 호출부가 세션을 영속화.
 * TODO(selector): 인증 샘플 필요 — PHP 폼 로그인(아이디/비번 입력 → 제출 → 결과 확인).
 */
export async function ensureLoggedIn(page: Page, cfg: Config, log: Logger): Promise<void> {
  if (!cfg.portal.configured || !cfg.portal.url) {
    throw new NotImplementedError('ADMIN_PORTAL_* 미설정')
  }

  if (await isLoggedIn(page, cfg)) {
    log.debug('이미 로그인 상태')
    return
  }

  log.info('로그인 시도', { url: cfg.portal.url })
  await page.goto(cfg.portal.url, { waitUntil: 'domcontentloaded' })

  // TODO(selector): 인증 샘플 필요 — 실제 폼 셀렉터/필드명/제출 흐름으로 교체.
  //   await page.fill('input[name="...id..."]', cfg.portal.id!)
  //   await page.fill('input[name="...pw..."]', cfg.portal.password!)
  //   await Promise.all([
  //     page.waitForNavigation({ waitUntil: 'networkidle' }),
  //     page.click('button[type="submit"], input[type="submit"]'),
  //   ])
  //   if (!(await isLoggedIn(page, cfg))) throw new Error('로그인 실패(자격증명/캡차/폼 변경 확인)')
  throw new NotImplementedError('grider 로그인 폼 셀렉터')
}

/**
 * 로그인된 페이지에서 SLA 데이터를 수집/파싱해 적재 페이로드로 변환.
 * TODO(selector): 인증 샘플 필요 — 데이터 페이지 이동 → 서버렌더 테이블 파싱 → 매핑.
 *   snapshot_date 는 cfg.timezone 기준 영업일을 사용한다(dateStringInTz, mockScrapeResult 참고).
 */
export async function fetchSlaData(_page: Page, _cfg: Config, _log: Logger): Promise<ScrapeResult> {
  // TODO(selector): 인증 샘플 필요 — 예시 골격:
  //   const snapshot_date = dateStringInTz(cfg.timezone)
  //   await page.goto(`${cfg.portal.url}/...`, { waitUntil: 'networkidle' })
  //   const rows = await page.$$eval('table.sla tbody tr', (trs) => trs.map((tr) => ({...})))
  //   return mapRowsToScrapeResult(rows, snapshot_date)  // src/types.ts 매핑
  throw new NotImplementedError('grider SLA 테이블 파서')
}

/**
 * 인프라/적재 파이프라인 검증용 결정적 mock 파서.
 * SCRAPE_MOCK=true 면 grider 로그인/브라우저 없이 Supabase upsert 경로를
 * end-to-end 점검한다(멱등 키·집계 RPC 동작 확인용).
 * ⚠️ 운영 금지 — admin_rider_id 는 'MOCK-' 접두로 식별/정리 용이.
 */
export function mockScrapeResult(cfg: Config): ScrapeResult {
  const snapshot_date = dateStringInTz(cfg.timezone)
  return {
    riders: [
      { admin_rider_id: 'MOCK-0001', name: '모의 라이더 1', phone: '010-0000-0001', region: '인천 남동구', is_active: true },
      { admin_rider_id: 'MOCK-0002', name: '모의 라이더 2', phone: '010-0000-0002', region: '인천 남동구', is_active: true },
    ],
    snapshots: [
      { admin_rider_id: 'MOCK-0001', snapshot_date, sla_score: 92.5, completed: 48, rejected: 2, dispatch_canceled: 1, delivery_canceled: 0, assigned: 51, acceptance_rate: 96.08 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, sla_score: 88.0, completed: 33, rejected: 5, dispatch_canceled: 2, delivery_canceled: 1, assigned: 40, acceptance_rate: 87.5 },
    ],
    hourly: [
      { admin_rider_id: 'MOCK-0001', snapshot_date, hour: 12, completed: 9 },
      { admin_rider_id: 'MOCK-0001', snapshot_date, hour: 18, completed: 14 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, hour: 12, completed: 7 },
      { admin_rider_id: 'MOCK-0002', snapshot_date, hour: 19, completed: 11 },
    ],
  }
}
