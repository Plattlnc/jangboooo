/**
 * 1분(설정값) 주기 스케줄러. setInterval 대신 자기보정 루프를 써서
 * 사이클이 길어져도 겹치지 않게 한다(다음 시작 = 주기 - 경과시간).
 */
import type { Logger } from './logger'
import { serializeError } from './logger'
import { withRetry } from './retry'
import { delay, withTimeout, TimeoutError } from './util'

export type LoopOptions = {
  intervalSeconds: number
  maxRetries: number
  signal: AbortSignal
  log: Logger
  /** 한 사이클. 던진 예외는 재시도 후 로깅되며 루프는 계속된다. */
  cycle: () => Promise<unknown>
  /** 재시도 여부 판정(예: 미구현 에러는 재시도하지 않음). */
  shouldRetry?: (err: unknown) => boolean
  /**
   * 사이클 직전 헬스 보장(예: 브라우저 크래시 시 재기동). 던지면 해당 틱은 실패로 집계되어
   * 다음 주기에 재시도된다(전체 프로세스는 죽지 않음).
   */
  ensureHealthy?: () => Promise<void>
  /**
   * 같은 증상으로 N회 연속 실패하면 자가치유를 위해 루프를 멈추고 onFatal 을 호출한다(0=비활성).
   * 한 번이라도 성공하면 카운터는 0으로 리셋된다(단발 실패로는 트리거되지 않음).
   */
  maxConsecutiveFailures?: number
  /** 연속 실패 임계 도달 시 1회 호출(예: 브라우저 정리 후 process.exit(1)). */
  onFatal?: (consecutiveFailures: number) => Promise<void> | void
}

export async function runLoop(opts: LoopOptions): Promise<void> {
  const { intervalSeconds, maxRetries, signal, log } = opts
  const periodMs = intervalSeconds * 1_000
  const failureLimit = opts.maxConsecutiveFailures ?? 0
  let consecutiveFailures = 0

  while (!signal.aborted) {
    const started = Date.now()
    let ok = false
    try {
      // 사이클 전 브라우저 등 헬스 보장(크래시 복구). 실패 시 아래 catch 로.
      if (opts.ensureHealthy) await opts.ensureHealthy()
      // 한 틱 전체(재시도 포함)를 주기 예산으로 상한. 초과 시 다음 틱으로 스킵.
      await withTimeout(
        withRetry(opts.cycle, {
          retries: maxRetries,
          signal,
          log,
          shouldRetry: opts.shouldRetry,
        }),
        periodMs,
        'scrape-cycle',
      )
      ok = true
    } catch (err) {
      if (err instanceof TimeoutError) {
        log.warn('사이클이 주기 예산 초과 — 다음 틱으로 스킵', { budgetMs: periodMs })
      } else {
        log.error('사이클 최종 실패(다음 주기 재시도)', serializeError(err))
      }
    }

    if (ok) {
      consecutiveFailures = 0
    } else {
      consecutiveFailures += 1
      log.warn('사이클 연속 실패', { consecutiveFailures, limit: failureLimit })
      // 종료 신호 중이면 자가치유 exit 보다 그레이스풀 종료를 우선한다(SIGTERM 충돌 방지).
      if (failureLimit > 0 && consecutiveFailures >= failureLimit && !signal.aborted) {
        log.error('연속 실패 임계 도달 — 자가치유 위해 루프 종료(컨테이너 재시작 유도)', {
          consecutiveFailures,
          limit: failureLimit,
        })
        if (opts.onFatal) await opts.onFatal(consecutiveFailures)
        return
      }
    }

    if (signal.aborted) break
    const elapsed = Date.now() - started
    const wait = Math.max(0, periodMs - elapsed)
    log.debug('다음 사이클 대기', { waitMs: wait, elapsedMs: elapsed })
    await delay(wait, signal)
  }
  log.info('스케줄러 루프 종료')
}
