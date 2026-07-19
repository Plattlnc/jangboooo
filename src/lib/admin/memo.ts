/**
 * 모듈 스코프 TTL 메모 — 웜 서버 인스턴스 내 관리자 쿼리 결과 재사용.
 * - 인플라이트 디듀프: 같은 키 동시 요청은 하나의 promise 를 공유(중복 fetch 방지).
 * - 실패는 즉시 축출(다음 요청이 재시도).
 * - 서버리스 특성상 인스턴스별 캐시 — 정합은 TTL(스크래퍼 60s 주기 대비 짧게)로 담보.
 */

const store = new Map<string, { exp: number; promise: Promise<unknown> }>()
const MAX_ENTRIES = 200

export function memoized<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = store.get(key)
  if (hit && hit.exp > now) return hit.promise as Promise<T>

  if (store.size >= MAX_ENTRIES) {
    // 커스텀 기간 키가 무한히 쌓이지 않게 가장 오래된 것부터 정리.
    const oldest = [...store.entries()].sort((a, b) => a[1].exp - b[1].exp).slice(0, MAX_ENTRIES / 2)
    for (const [k] of oldest) store.delete(k)
  }

  const promise = fn().catch((e: unknown) => {
    store.delete(key)
    throw e
  })
  store.set(key, { exp: now + ttlMs, promise })
  return promise
}

/** 테스트/디버그용 전체 초기화. */
export function clearMemo(): void {
  store.clear()
}
