// 관리자 화면 공통 포맷 헬퍼 — 순수 함수(클라이언트/서버 공용).
import type { PeriodRange } from "@/lib/supabase/admin-queries";
import type { SlaPeriod } from "@/types/database";

const KDOW = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → 'M월 D일(요일)'. TZ 영향 없게 UTC 파싱. */
export function fmtKDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = KDOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일(${dow})`;
}

/** 'YYYY-MM-DD' → 'MM.DD(요일)'. */
export function fmtShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = KDOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")}(${dow})`;
}

/** 기간 라벨 — 일간=단일 날짜, 주간/월간=범위. */
export function fmtRangeLabel(period: SlaPeriod, range: PeriodRange): string {
  if (period === "today") return `${fmtKDate(range.start_date)} 기준`;
  return `${fmtKDate(range.start_date)} ~ ${fmtKDate(range.end_date)}`;
}

/** 커스텀 선택 범위 라벨 — 단일일이면 '기준' 표기. */
export function fmtDateRange(range: PeriodRange): string {
  if (range.start_date === range.end_date) return `${fmtKDate(range.start_date)} 기준`;
  return `${fmtKDate(range.start_date)} ~ ${fmtKDate(range.end_date)}`;
}

/** 퍼센트 — null 은 '—'. 저장 정밀도(소수 2자리)를 1자리로 표시. */
export function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${(Math.round(v * 10) / 10).toLocaleString("ko-KR")}%`;
}

/** 건수 — 천단위 구분. */
export function fmtCount(v: number): string {
  return v.toLocaleString("ko-KR");
}

/** ISO timestamp → 'HH:MM 수집' (KST). null 은 '수집 전'. */
export function fmtCapturedAt(ts: string | null): string {
  if (!ts) return "수집 전";
  const d = new Date(ts);
  const kst = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${kst} 수집`;
}

/** 수락률 상태 밴드(라이더 홈과 동일 경계: ≥85 양호 / ≥70 주의 / 미만 위험). */
export function acceptBand(v: number | null | undefined): { label: string; color: string; tint: string } {
  if (v == null) return { label: "—", color: "#9b9588", tint: "#f4f5f7" };
  if (v >= 85) return { label: "양호", color: "#1E9E5A", tint: "#e7f5ee" };
  if (v >= 70) return { label: "주의", color: "#E8590C", tint: "#fdf0e6" };
  return { label: "위험", color: "#D9342B", tint: "#fbe9e8" };
}
