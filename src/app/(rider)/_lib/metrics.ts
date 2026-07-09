// 대시보드(개편) 지표 → 표시 변환. SSOT: docs/design/06-dashboard-redesign.md.
// SLA 점수 제거(2026-06-28) → 메인 지표는 수락률(acceptance_rate) 원형 게이지.
// frontend 가 색/밴드/버킷 경계를 자의로 고르지 않도록 임계값을 여기서 고정한다.

import type { SlaPeriod } from "@/types/database";

// ── 기간(period) 유틸 — 클라이언트 안전(서버 의존 없음). ────────────
export const SLA_PERIODS: readonly SlaPeriod[] = ["today", "week", "month"];

export function isSlaPeriod(value: unknown): value is SlaPeriod {
  return typeof value === "string" && (SLA_PERIODS as readonly string[]).includes(value);
}

/** searchParams 의 period 값을 안전하게 SlaPeriod 로 정규화 (기본 today). */
export function parsePeriod(raw: string | string[] | undefined): SlaPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isSlaPeriod(value) ? value : "today";
}

/** 기간 탭 라벨. */
export const PERIOD_LABEL: Record<SlaPeriod, string> = {
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
};

/** 게이지 라벨(기간 연동). 카피 SSOT: docs/copy/dashboard.md §3. */
export const GAUGE_LABEL: Record<SlaPeriod, string> = {
  today: "오늘 수락률",
  week: "이번 주 수락률",
  month: "이번 달 수락률",
};

// ── 수락률 게이지 밴드 (06 §D — frontend 자의 금지) ────────────────
export type GaugeBand = "high" | "mid" | "low";

/** 수락률(0~100%) → 밴드. ≥80 high · 40–79 mid · 0–39 low. */
export function gaugeBand(rate: number): GaugeBand {
  if (rate >= 80) return "high";
  if (rate >= 40) return "mid";
  return "low";
}

/** 게이지 보조 문구(하단 1줄·조건부). 카피 SSOT: dashboard.md §3. */
export function gaugeNote(rate: number | null, period: SlaPeriod): string | null {
  if (rate == null) return null;
  if (rate >= 90) return "콜을 잘 잡고 있어요";
  if (rate >= 70) return null; // 보통 — 숫자만
  return `${PERIOD_LABEL[period]}엔 조금 낮아요`;
}

// ── 4피크 라벨 SSOT — PeakCard·GoalCard 통일(인접 카드 동일 표기). ────
// peak_key(backend center-goals 계약: ml/pl/d/pd) 기준. 두 카드가 모두 이 맵을 참조해 분기 방지.
export type PeakKey = "ml" | "pl" | "d" | "pd";
export const PEAK_LABEL: Record<PeakKey, string> = {
  ml: "아침점심피크",
  pl: "오후논피크",
  d: "저녁피크",
  pd: "심야논피크",
};

// (제거됨) 피크 4버킷 시간 경계 추정 집계(aggregatePeakBuckets) — 배민 원본 버킷값
// (sla_snapshots.peak_*, getRiderPeaksFor)과 어긋나 폐기. 피크값은 원본 그대로 사용한다.

// ── 실시간 상태 (헤더 인디케이터). 카피 SSOT: dashboard.md §6. ──────
export type LiveTone = "live" | "muted";

/** 갱신 시각 → 신선도 표기 + stale 여부(>3분). */
export function formatUpdatedAt(
  iso: string | null,
  now: number = Date.now(),
): { text: string; stale: boolean } {
  if (!iso) return { text: "업데이트 정보 없음", stale: true };
  const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (diffMin <= 0) return { text: "방금 업데이트됨", stale: false };
  return { text: `${diffMin}분 전 업데이트`, stale: diffMin > 3 };
}

/** stale 여부 → 라이브 인디케이터 문구/톤. */
export function liveStatus(stale: boolean): { label: string; tone: LiveTone } {
  return stale
    ? { label: "갱신이 조금 늦어지고 있어요", tone: "muted" }
    : { label: "실시간 업데이트 중", tone: "live" };
}

// ── 헤더 날짜·시각 표기 (06 §B). 카피 SSOT: microcopy.md §시간 표기. ──
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * `YY년 M월 D일 (요일) 오전/오후 h:mm` 포맷. 기본 Asia/Seoul.
 * Intl.formatToParts 로 TZ 정확한 각 필드 추출 후 한국어 표기로 조립.
 */
export function formatDashboardDate(date: Date, timeZone = "Asia/Seoul"): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = WEEKDAY[new Date(date.toLocaleString("en-US", { timeZone })).getDay()];
  const period = get("dayPeriod").toUpperCase().includes("PM") ? "오후" : "오전";
  return `${get("year")}년 ${get("month")}월 ${get("day")}일 (${wd}) ${period} ${get("hour")}:${get("minute")}`;
}
