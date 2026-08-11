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
