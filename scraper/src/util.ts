/** 공용 유틸: 시간대 기준 날짜, abort 가능한 delay. */

/**
 * 주어진 시간대(기본 Asia/Seoul) 기준 영업일을 YYYY-MM-DD 로 반환.
 * sla_snapshots.snapshot_date / rider_hourly_stats.snapshot_date 의 키.
 * en-CA 로케일은 항상 YYYY-MM-DD 포맷을 낸다.
 */
export function dateStringInTz(timeZone = 'Asia/Seoul', d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * ms 만큼 대기. signal 이 abort 되면 즉시 resolve(반복 루프 조기 종료용).
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      resolve()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
