// 정산 날짜 유틸 — 모두 KST(Asia/Seoul) 기준. 배달처리비는 T+1(익일 오전 적재)이라
// 일일 정산 기본 날짜 = "어제".

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 오늘(KST) YYYY-MM-DD. */
export function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** YYYY-MM-DD 에 days 를 더한 날짜(음수 가능). */
export function ymdAdd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/** 어제(KST) YYYY-MM-DD — 일일 정산 기본값. */
export function kstYesterday(): string {
  return ymdAdd(kstToday(), -1);
}

/** YYYY-MM-DD → 요일(한 글자). */
export function weekdayKo(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAY_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** YYYY-MM-DD → "M월 D일 (요일)". */
export function formatKoreanDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}월 ${d}일 (${weekdayKo(ymd)})`;
}

/** YYYY-MM-DD 유효성(간단). */
export function isValidYmd(v: string | undefined | null): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** YYYY-MM-DD 가 속한 주(수~화)의 수요일(주 시작). */
export function weekStartOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 일0..토6
  const isodow = ((dow + 6) % 7) + 1; // 월1..일7
  const offset = (isodow - 3 + 7) % 7; // 수요일(3)까지 뒤로
  return ymdAdd(ymd, -offset);
}

/** YYYY-MM-DD 가 속한 주(수~화) 범위. */
export function weekRangeOf(ymd: string): { start: string; end: string } {
  const start = weekStartOf(ymd);
  return { start, end: ymdAdd(start, 6) };
}

/** 오늘(KST) 기준 YYYY-MM. */
export function kstMonth(): string {
  return kstToday().slice(0, 7);
}

/** YYYY-MM 유효성. */
export function isValidYm(v: string | undefined | null): v is string {
  return !!v && /^\d{4}-\d{2}$/.test(v);
}

/** YYYY-MM 에 months 를 더한 월(음수 가능). */
export function ymAdd(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const total = (y * 12 + (m - 1)) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

/**
 * 월(YYYY-MM)에 속한 주(수~화) 목록 — 주의 시작(수요일)이 그 달에 속하면 그 달 주차.
 * (월 경계를 넘는 주는 시작 수요일이 있는 '전달'의 마지막 주차로 귀속. 예: 7/29~8/4 = 7월 5주차.) 보통 4~5주.
 */
export function monthWeeks(ym: string): { start: string; end: string }[] {
  const first = `${ym}-01`;
  let w = weekStartOf(first); // 1일이 속한 주의 수요일(전월일 수 있음)
  if (w < first) w = ymdAdd(w, 7); // 시작 수요일이 전월이면 그 달 첫 수요일로
  const weeks: { start: string; end: string }[] = [];
  while (w.slice(0, 7) === ym) {
    // 시작 수요일이 이 달에 속하는 동안
    weeks.push({ start: w, end: ymdAdd(w, 6) });
    w = ymdAdd(w, 7);
  }
  return weeks;
}

/** YYYY-MM-DD → "M/D" (양식 기간 표기). */
export function mdShort(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}
