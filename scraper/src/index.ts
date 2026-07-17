/**
 * 스크래퍼 워커 엔트리포인트.
 *  - 설정 로딩/검증 → 실패 시 즉시 종료(exit 1)
 *  - Supabase/브라우저 기동
 *  - --once: 1회 실행 후 종료 / 기본: 1분 주기 상주 루프
 *  - SIGINT/SIGTERM 그레이스풀 종료(브라우저 정리)
 */
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { loadConfig, type Config } from './config'
import { createLogger, serializeError, type Logger } from './logger'
import { createDb, upsertCenterGoalTargets } from './supabase'
import { BrowserSession } from './browser'
import { runScrapeCycle } from './scrape'
import { runLoop } from './scheduler'
import { isSessionExpired } from './sources/baemin'
import { collectCenterGoals } from './sources/baemin-goals-session'
import { delay, withTimeout } from './util'

/**
 * Railway 등 영속 FS 없는 환경: STORAGE_STATE_B64 가 있고 세션 파일이 없으면
 * base64 를 디코드해 파일로 복원(로컬 캡처본을 워커에 주입하는 경로).
 */
async function restoreSessionFromB64(cfg: Config, log: Logger): Promise<void> {
  if (!cfg.storageStateB64) return
  try {
    await access(cfg.storageStatePath)
    log.debug('세션 파일 존재 — B64 복원 생략')
    return
  } catch {
    /* 파일 없음 → 복원 진행 */
  }
  try {
    const json = Buffer.from(cfg.storageStateB64, 'base64').toString('utf8')
    JSON.parse(json) // 유효성 점검(깨진 base64 조기 발견)
    await mkdir(dirname(cfg.storageStatePath), { recursive: true })
    await writeFile(cfg.storageStatePath, json)
    log.info('STORAGE_STATE_B64 → 세션 파일 복원', { path: cfg.storageStatePath })
  } catch (err) {
    log.error('STORAGE_STATE_B64 복원 실패(세션 만료처럼 동작할 수 있음)', serializeError(err))
  }
}

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
    mock: cfg.mock,
    timezone: cfg.timezone,
  })
  if (cfg.mock) {
    log.warn('MOCK 모드 활성 — 운영 금지. 배민 미접속, 가짜 데이터로 적재 파이프라인만 검증.')
  } else if (!cfg.portal.configured) {
    log.warn('ADMIN_PORTAL_URL 미설정 → 골격 모드(수집 스킵). 배민 URL 설정 + 세션 캡처 필요.')
  }

  const db = createDb(cfg)
  const session = new BrowserSession(cfg, log)
  // 실제 수집(포털 설정 + 비-mock)일 때만 브라우저 기동. 그 외엔 가볍게 상주.
  const needsBrowser = cfg.portal.configured && !cfg.mock
  if (needsBrowser) {
    await restoreSessionFromB64(cfg, log) // 세션 파일 없으면 B64 에서 복원
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

  // 공동목표(달성현황 beta): 구글 세션이 있을 때만, 배달현황과 독립된 느린 주기로 best-effort 수집.
  const goalsEnabled = cfg.goals.configured && !cfg.mock
  if (!goalsEnabled) {
    log.info('공동목표 수집 비활성(GOOGLE_STORAGE_STATE_B64 미설정 또는 mock)')
  }
  let goalLoopDone: Promise<void> | undefined

  try {
    if (cfg.runOnce) {
      log.info('1회 실행 모드')
      await cycle()
      if (goalsEnabled) await collectAndUpsertGoals(cfg, db, log)
    } else {
      // 배달현황 루프와 동시 실행(독립). 종료신호는 같은 controller.signal 로 함께 멈춘다.
      if (goalsEnabled) goalLoopDone = runGoalLoop(cfg, db, log, controller.signal)
      await runLoop({
        intervalSeconds: cfg.intervalSeconds,
        maxRetries: cfg.maxRetries,
        signal: controller.signal,
        log,
        cycle,
        // 세션 만료는 재시도 무의미(무인 복구 불가) → 즉시 다음 주기로.
        shouldRetry: (err) => !isSessionExpired(err),
        // 브라우저 크래시/disconnect 복구: 실수집 모드일 때만 사이클 전 재기동 보장.
        ensureHealthy: needsBrowser ? () => session.ensureStarted() : undefined,
        // 자가치유: N회 연속 실패 시 브라우저 정리 후 exit(1) → Railway 재시작 정책이 회복.
        maxConsecutiveFailures: cfg.maxConsecutiveFailures,
        onFatal: async (failures) => {
          log.error('연속 실패로 워커 종료(exit 1) — 컨테이너 재시작 기대', { failures })
          await session.close().catch(() => {})
          process.exit(1)
        },
      })
    }
  } finally {
    await goalLoopDone?.catch(() => {}) // 공동목표 루프 정리(브라우저 close) 대기
    await session.close()
  }
}

/** 공동목표 1회 수집+적재(best-effort, 절대 throw 안 함). */
async function collectAndUpsertGoals(cfg: Config, db: ReturnType<typeof createDb>, log: Logger): Promise<void> {
  try {
    // 워치독: 한 번의 수집이 행에 걸리면 goal 루프 전체가 영구 정지(2026-07-16 사고).
    // launch 60s + goto 30s + 응답 폴링 30s 를 넉넉히 덮는 4분 상한.
    const rows = await withTimeout(collectCenterGoals(cfg, log), 4 * 60_000, '공동목표 수집')
    const n = await upsertCenterGoalTargets(db, rows)
    if (n > 0) log.info('공동목표 goal 적재', { rows: n })
  } catch (err) {
    log.error('공동목표 수집/적재 실패(스킵, 다음 주기 재시도)', serializeError(err))
  }
}

/** 공동목표 독립 루프. 배달현황(1분)보다 느린 주기(최소 10분)로 수집. signal 로 종료. */
async function runGoalLoop(
  cfg: Config,
  db: ReturnType<typeof createDb>,
  log: Logger,
  signal: AbortSignal,
): Promise<void> {
  const periodMs = Math.max(cfg.intervalSeconds, 600) * 1_000 // 목표는 천천히 변함 → 최소 10분
  log.info('공동목표 루프 시작', { periodMs })
  while (!signal.aborted) {
    await collectAndUpsertGoals(cfg, db, log)
    if (signal.aborted) break
    await delay(periodMs, signal)
  }
  log.info('공동목표 루프 종료')
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ level: 'error', msg: '치명적 오류', ...serializeError(err) }) + '\n')
  process.exit(1)
})
