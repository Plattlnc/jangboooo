/**
 * grider(관리자 포털) 사이트 어댑터 — 로그인 + 데이터 파싱.
 *
 * ⚠️ 인증 샘플(실제 URL/로그인 폼/SLA 테이블 마크업) 도착 전까지 셀렉터와
 *    파서는 채울 수 없다. 아래 TODO(auth-sample) 지점이 backend 와 공동으로
 *    채울 영역이다. 그 전에는 NotImplementedError 를 던져 사이클이 골격
 *    모드로 안전하게 스킵되도록 한다.
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
 * TODO(auth-sample): 로그인 시에만 보이는 요소/URL 로 판정 로직 작성.
 */
export async function isLoggedIn(_page: Page, _cfg: Config): Promise<boolean> {
  // TODO(auth-sample): 예) 대시보드 헤더, 로그아웃 버튼, 특정 쿠키 존재 여부 등.
  return false
}

/**
 * 필요 시 로그인 수행(이미 로그인 상태면 no-op). 성공 시 호출부가 세션을 영속화.
 * TODO(auth-sample): PHP 폼 로그인 플로우(아이디/비번 입력 → 제출 → 결과 확인).
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

  // TODO(auth-sample): 실제 셀렉터로 교체.
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
 * TODO(auth-sample): 데이터 페이지 이동 → 테이블/네트워크 응답 파싱 → 매핑.
 *   snapshot_date 는 cfg.timezone 기준 영업일을 사용한다(아래 헬퍼 참고).
 */
export async function fetchSlaData(_page: Page, cfg: Config, _log: Logger): Promise<ScrapeResult> {
  // 영업일 키(파서가 행마다 사용). 미사용 경고 방지를 위해 한 번 계산.
  void dateStringInTz(cfg.timezone)

  // TODO(auth-sample): 예시 골격 —
  //   await page.goto(`${cfg.portal.url}/sla`, { waitUntil: 'networkidle' })
  //   const rows = await page.$$eval('table.sla tbody tr', (trs) => trs.map((tr) => ({...})))
  //   return mapRowsToScrapeResult(rows, snapshotDate)
  throw new NotImplementedError('grider SLA 테이블 파서')
}
