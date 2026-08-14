/** 공용 유틸: 시간대 기준 날짜, abort 가능한 delay. */

/**
 * 실행 머신 시계 스큐 보정 오프셋(ms). 2026-07-31 로컬 맥 시계가 19h 느려
 * 당일 데이터를 전날 영업일(snapshot_date)로 오염시킨 사고의 방어(어느 방향의
 * 스큐든 커버). 신뢰 서버(HTTP Date 헤더)와 대조해 갱신하며, 동기화 전/실패 시
 * 0(기존 동작 동일).
 */
let clockOffsetMs = 0

export function setClockOffsetMs(ms: number): void {
  clockOffsetMs = ms
}

/** 스큐 보정이 반영된 현재 시각. 영업일 계산·captured_at 등 데이터에 남는 시각은 이걸 쓴다. */
export function trustedNow(): Date {
  return new Date(Date.now() + clockOffsetMs)
}

/**
 * 신뢰 서버(Supabase 등)의 HTTP Date 헤더(초 단위)로 clockOffsetMs 를 갱신.
 * 성공 시 측정 skew(ms) 반환, 실패 시 null(오프셋 유지). 절대 throw 하지 않는다.
 * ±5s 이내는 로컬 시계 신뢰(Date 헤더 정밀도 한계).
 */
export async function syncClockOffsetFromServer(baseUrl: string): Promise<number | null> {
  try {
    const res = await fetch(new URL('/rest/v1/', baseUrl), { signal: AbortSignal.timeout(10_000) })
    const header = res.headers.get('date')
    if (!header) return null
    const server = Date.parse(header)
    if (!Number.isFinite(server)) return null
    const skew = server - Date.now()
    clockOffsetMs = Math.abs(skew) < 5_000 ? 0 : skew
    return skew
  } catch {
    return null
  }
}

/**
 * 주어진 시간대(기본 Asia/Seoul) 기준 영업일을 YYYY-MM-DD 로 반환.
 * sla_snapshots.snapshot_date / rider_hourly_stats.snapshot_date 의 키.
 * en-CA 로케일은 항상 YYYY-MM-DD 포맷을 낸다.
 */
export function dateStringInTz(timeZone = 'Asia/Seoul', d: Date = trustedNow()): string {
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
export function businessDayInTz(timeZone = 'Asia/Seoul', d: Date = trustedNow()): string {
  return dateStringInTz(timeZone, new Date(d.getTime() - 6 * 60 * 60 * 1000))
}

/**
 * 영업일 전환(06:00) 직후 그레이스 구간 여부. 배민 API 카운터가 서버측에서 리셋되기 전의
 * 전일 누적치가 새 영업일 키로 오염 적재되는 것을 막는다. (2026-08-14 사고: 06:00 사이클이
 * 전일 최종 피크값을 새 날짜에 시드 → current 단조 가드가 이후 실값 갱신을 하루 종일 차단.)
 */
export function isBusinessDayRollover(
  timeZone = 'Asia/Seoul',
  d: Date = trustedNow(),
  graceMinutes = 10,
): boolean {
  // 영업일 앵커(-6h)로 정렬하면 06:00 경계가 자정이 된다 → 자정으로부터 경과 분만 보면 됨.
  const shifted = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(shifted)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 'NaN')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 'NaN')
  return h === 0 && m < graceMinutes
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
