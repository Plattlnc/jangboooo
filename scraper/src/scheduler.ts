/**
 * 1분(설정값) 주기 스케줄러. setInterval 대신 자기보정 루프를 써서
 * 사이클이 길어져도 겹치지 않게 한다(다음 시작 = 주기 - 경과시간).
 */
import type { Logger } from './logger'
import { serializeError } from './logger'
import { withRetry } from './retry'
import { delay } from './util'

export type LoopOptions = {
  intervalSeconds: number
  maxRetries: number
  signal: AbortSignal
  log: Logger
  /** 한 사이클. 던진 예외는 재시도 후 로깅되며 루프는 계속된다. */
  cycle: () => Promise<unknown>
  /** 재시도 여부 판정(예: 미구현 에러는 재시도하지 않음). */
  shouldRetry?: (err: unknown) => boolean
}

export async function runLoop(opts: LoopOptions): Promise<void> {
  const { intervalSeconds, maxRetries, signal, log } = opts
  const periodMs = intervalSeconds * 1_000

  while (!signal.aborted) {
    const started = Date.now()
    try {
      await withRetry(opts.cycle, {
        retries: maxRetries,
        signal,
        log,
        shouldRetry: opts.shouldRetry,
      })
    } catch (err) {
      log.error('사이클 최종 실패(다음 주기 재시도)', serializeError(err))
    }

    if (signal.aborted) break
    const elapsed = Date.now() - started
    const wait = Math.max(0, periodMs - elapsed)
    log.debug('다음 사이클 대기', { waitMs: wait, elapsedMs: elapsed })
    await delay(wait, signal)
  }
  log.info('스케줄러 루프 종료')
}
