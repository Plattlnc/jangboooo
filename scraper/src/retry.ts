/** 지수 백오프 재시도. NotImplemented 같은 "재시도 무의미" 에러는 즉시 중단. */
import type { Logger } from './logger'
import { serializeError } from './logger'
import { delay } from './util'

export type RetryOptions = {
  retries: number
  baseDelayMs?: number
  maxDelayMs?: number
  signal?: AbortSignal
  log?: Logger
  /** false 를 반환하면 재시도하지 않고 즉시 throw. */
  shouldRetry?: (err: unknown) => boolean
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const base = opts.baseDelayMs ?? 1_000
  const max = opts.maxDelayMs ?? 30_000
  let attempt = 0

  for (;;) {
    try {
      return await fn()
    } catch (err) {
      attempt += 1
      const retryable = opts.shouldRetry ? opts.shouldRetry(err) : true
      const exhausted = attempt > opts.retries
      if (!retryable || exhausted || opts.signal?.aborted) {
        throw err
      }
      const wait = Math.min(max, base * 2 ** (attempt - 1))
      opts.log?.warn('재시도 예정', {
        attempt,
        retries: opts.retries,
        waitMs: wait,
        ...serializeError(err),
      })
      await delay(wait, opts.signal)
    }
  }
}
