/**
 * 스크래퍼 워커 엔트리포인트.
 *  - 설정 로딩/검증 → 실패 시 즉시 종료(exit 1)
 *  - Supabase/브라우저 기동
 *  - --once: 1회 실행 후 종료 / 기본: 1분 주기 상주 루프
 *  - SIGINT/SIGTERM 그레이스풀 종료(브라우저 정리)
 */
import { loadConfig } from './config'
import { createLogger, serializeError } from './logger'
import { createDb } from './supabase'
import { BrowserSession } from './browser'
import { runScrapeCycle } from './scrape'
import { runLoop } from './scheduler'
import { isNotImplemented } from './sources/grider'

async function main(): Promise<void> {
  // 1) 설정 — 검증 실패는 부팅 차단.
  let cfg
  try {
    cfg = loadConfig()
  } catch (err) {
    // 로거 전 단계라 stderr 로 직접 출력.
    process.stderr.write(JSON.stringify({ level: 'error', msg: '설정 로딩 실패', ...serializeError(err) }) + '\n')
    process.exit(1)
    return
  }

  const log = createLogger(cfg.logLevel, { svc: 'scraper' })
  log.info('워커 시작', {
    runOnce: cfg.runOnce,
    intervalSeconds: cfg.intervalSeconds,
    portalConfigured: cfg.portal.configured,
    timezone: cfg.timezone,
  })
  if (!cfg.portal.configured) {
    log.warn('ADMIN_PORTAL_* 미설정 → 골격 모드(수집 스킵). 인증 샘플 도착 후 자격증명/셀렉터 채울 것.')
  }

  const db = createDb(cfg)
  const session = new BrowserSession(cfg, log)
  // 골격 모드(포털 미설정)에선 브라우저를 띄우지 않는다 — 가볍게 상주만.
  if (cfg.portal.configured) {
    await session.start()
  }

  const controller = new AbortController()
  let shuttingDown = false
  const shutdown = (sig: string): void => {
    if (shuttingDown) return
    shuttingDown = true
    log.info('종료 신호 수신 — 정리 시작', { signal: sig })
    controller.abort()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  const cycle = (): Promise<unknown> => runScrapeCycle({ cfg, log, db, session })

  try {
    if (cfg.runOnce) {
      log.info('1회 실행 모드')
      await cycle()
    } else {
      await runLoop({
        intervalSeconds: cfg.intervalSeconds,
        maxRetries: cfg.maxRetries,
        signal: controller.signal,
        log,
        cycle,
        // 미구현(인증 샘플 대기) 에러는 재시도 무의미 → 즉시 다음 주기로.
        shouldRetry: (err) => !isNotImplemented(err),
      })
    }
  } finally {
    await session.close()
  }
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ level: 'error', msg: '치명적 오류', ...serializeError(err) }) + '\n')
  process.exit(1)
})
