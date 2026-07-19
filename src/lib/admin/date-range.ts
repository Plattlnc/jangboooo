/**
 * 관리자 커스텀 기간 선택 — 순수 날짜 헬퍼(클라이언트/서버 공용, 테스트 용이).
 *
 * 규칙(사용자 확정):
 * - 시작일~마감일 포함 최대 7일.
 * - 당일(현재 영업일)은 선택 불가 — 실시간 수집 중이라 결과가 미확정. 마감 상한 = 영업일 어제.
 * - 공동목표 이력은 스팬 제한 없음(과거 전체 조회 가능), 당일 제외 규칙만 동일.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export interface DateRange {
  start_date: string
  end_date: string
}

/** 'YYYY-MM-DD' + n일 (TZ 무관 UTC 산술). */
export function addDaysIso(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

/** 형식 + 실존 날짜 검증. */
export function isValidIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO_DATE.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

/**
 * 커스텀 기간 클램프 — from/to 둘 중 하나라도 유효하면 규칙에 맞게 보정해 반환.
 * 둘 다 무효(미지정)면 null(커스텀 미사용 신호).
 *
 * 보정 순서: 단일값은 from=to 로 → 역순이면 스왑 → 마감을 어제 영업일로 클램프
 * → 스팬 maxSpanDays(기본 7일, null=무제한) 초과 시 시작일을 당겨 맞춤.
 */
export function clampCustomRange(
  fromRaw: unknown,
  toRaw: unknown,
  businessToday: string,
  maxSpanDays: number | null = 7,
): DateRange | null {
  const from = isValidIsoDate(fromRaw) ? fromRaw : null
  const to = isValidIsoDate(toRaw) ? toRaw : null
  if (!from && !to) return null

  let start = from ?? (to as string)
  let end = to ?? (from as string)
  if (start > end) [start, end] = [end, start]

  const maxEnd = addDaysIso(businessToday, -1) // 당일 제외
  if (end > maxEnd) end = maxEnd
  if (start > end) start = end

  if (maxSpanDays != null) {
    const minStart = addDaysIso(end, -(maxSpanDays - 1))
    if (start < minStart) start = minStart
  }

  return { start_date: start, end_date: end }
}
