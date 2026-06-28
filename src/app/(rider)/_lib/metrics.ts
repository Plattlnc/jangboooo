// 대시보드(개편) 지표 → 표시 변환. SSOT: docs/design/06-dashboard-redesign.md.
// SLA 점수 제거(2026-06-28) → 메인 지표는 수락률(acceptance_rate) 원형 게이지.
// frontend 가 색/밴드/버킷 경계를 자의로 고르지 않도록 임계값을 여기서 고정한다.

import type { RiderHourlyRow, SlaPeriod } from "@/types/database";

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

// ── 피크타임 4버킷 집계 (06 §F / §8) ──────────────────────────────
// ⚠️ 버킷 시간 경계는 backend 와 미확정(06 §9-3). 아래는 잠정값 — 확정 시 교체.
export interface PeakBucket {
  key: "morning" | "afternoon" | "evening" | "midnight";
  label: string;
  count: number;
}

const PEAK_BUCKETS: { key: PeakBucket["key"]; label: string; hours: number[] }[] = [
  { key: "morning", label: "아침·점심 피크", hours: [6, 7, 8, 9, 10, 11, 12, 13] },
  { key: "afternoon", label: "오후 비피크", hours: [14, 15, 16] },
  { key: "evening", label: "저녁 피크", hours: [17, 18, 19, 20, 21] },
  { key: "midnight", label: "심야 비피크", hours: [22, 23, 0, 1, 2, 3, 4, 5] },
];

/** 0~23시 완료 분포 → 4버킷 합계(고정 라벨·순서). */
export function aggregatePeakBuckets(hourly: RiderHourlyRow[]): PeakBucket[] {
  const byHour = new Map<number, number>();
  for (const row of hourly) byHour.set(row.hour, (byHour.get(row.hour) ?? 0) + row.completed);
  return PEAK_BUCKETS.map(({ key, label, hours }) => ({
    key,
    label,
    count: hours.reduce((sum, h) => sum + (byHour.get(h) ?? 0), 0),
  }));
}

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
