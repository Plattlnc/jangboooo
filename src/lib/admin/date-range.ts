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

/** 'YYYY-MM-DD' → 'M.D'(월.일). */
function mmdd(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${m}.${d}`
}

/** iso 가 속한 주(수요일 시작)의 수요일 날짜. (isodow: 월1..일7, 수=3 — 0009 마이그레이션과 동일) */
export function weekStartOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 일0..토6
  const isodow = ((dow + 6) % 7) + 1 // 월1..일7
  const offset = (isodow - 3 + 7) % 7
  return addDaysIso(iso, -offset)
}

/** 주(수~화) 범위. weekStart = 수요일. */
export function weekRangeOf(weekStart: string): DateRange {
  return { start_date: weekStart, end_date: addDaysIso(weekStart, 6) }
}

/** 최근 count 주(현재 주 포함) 목록 — 수~화. 최신이 먼저(value=수요일 날짜). */
export function buildWeekOptions(businessToday: string, count: number): { value: string; label: string; range: DateRange }[] {
  const curWed = weekStartOf(businessToday)
  return Array.from({ length: count }, (_, i) => {
    const value = addDaysIso(curWed, -7 * i)
    const range = weekRangeOf(value)
    return { value, label: `${mmdd(range.start_date)} ~ ${mmdd(range.end_date)}`, range }
  })
}

/** 'YYYY-MM' → 달력월 범위(1일~말일, end 는 businessToday 이하로 클램프). */
export function monthRangeOf(ym: string, businessToday: string): DateRange {
  const [y, m] = ym.split('-').map(Number) // m: 1-based
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const end = `${ym}-${String(lastDay).padStart(2, '0')}`
  return { start_date: `${ym}-01`, end_date: end > businessToday ? businessToday : end }
}

/** 최근 count 개월(이번 달 포함) 목록 — 최신이 먼저(value='YYYY-MM'). */
export function buildMonthOptions(businessToday: string, count: number): { value: string; label: string; range: DateRange }[] {
  const [y, m] = businessToday.split('-').map(Number) // m: 1-based
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1))
    const yy = dt.getUTCFullYear()
    const mm = dt.getUTCMonth() + 1
    const value = `${yy}-${String(mm).padStart(2, '0')}`
    return { value, label: `${yy}년 ${mm}월`, range: monthRangeOf(value, businessToday) }
  })
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
