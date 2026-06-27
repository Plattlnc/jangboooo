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
 * 배민 영업일 기준 날짜(YYYY-MM-DD). 영업일 = 06:00 ~ 익일 05:59 (해당 TZ).
 * 06:00 이전이면 전날이 영업일(예: 06/28 03:00 → 06/27). 시각에서 6h 빼면
 * 영업일 경계(06:00)가 자정 경계로 정렬되어 dateStringInTz 로 변환 가능.
 */
export function businessDayInTz(timeZone = 'Asia/Seoul', d: Date = new Date()): string {
  return dateStringInTz(timeZone, new Date(d.getTime() - 6 * 60 * 60 * 1000))
}

/** 주어진 예산(ms) 초과 시 reject. 사이클 시간 상한(다음 틱 스킵)에 사용. */
export class TimeoutError extends Error {
  constructor(ms: number, label: string) {
    super(`타임아웃(${ms}ms) 초과: ${label}`)
    this.name = 'TimeoutError'
  }
}

/**
 * promise 가 ms 안에 끝나지 않으면 TimeoutError 로 reject.
 * (in-flight 작업을 강제 취소하진 않지만, navTimeout 으로 개별 동작이 이미
 *  유한하고 upsert 는 멱등이라 늦게 끝난 작업이 겹쳐도 무해하다.)
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms, label)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
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
