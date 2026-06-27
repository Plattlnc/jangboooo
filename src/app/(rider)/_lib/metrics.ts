// 지표 → 상태색/등급/델타 변환. 00-foundations §1 · 03-screen-dashboard §E.
// frontend 가 색을 자의로 고르지 않도록 임계값/방향을 여기서 고정한다.

import type { SlaPeriod } from "@/types/database";

export type StatusColor = "success" | "warning" | "danger";

/** SLA 점수 → 등급 라벨 + 상태색 (≥90 우수 / 70–89 주의 / <70 위험). */
export function slaGrade(score: number): { label: string; status: StatusColor } {
  if (score >= 90) return { label: "우수", status: "success" };
  if (score >= 70) return { label: "주의", status: "warning" };
  return { label: "위험", status: "danger" };
}

/**
 * 수락률(%) → 상태색 (≥95 우수 / 85–94 주의 / <85 위험).
 * 단위는 backend 계약과 동일 0~100 퍼센트(sla-api.md §6).
 */
export function acceptanceStatus(pct: number): StatusColor {
  if (pct >= 95) return "success";
  if (pct >= 85) return "warning";
  return "danger";
}

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

export type GoodDirection = "up" | "down";
export type DeltaTone = "success" | "warning" | "neutral";

/**
 * 델타 색 방향 (03 §E — frontend 자의 금지).
 * 긍정지표(완료/수락률/SLA): 증가=success, 감소=warning.
 * 부정지표(거절/취소): 감소=success, 증가=warning. 화살표는 실제 증감, 색만 의미 기준.
 */
export function deltaTone(delta: number, good: GoodDirection): DeltaTone {
  if (delta === 0) return "neutral";
  const improved = good === "up" ? delta > 0 : delta < 0;
  return improved ? "success" : "warning";
}

export const PERIOD_LABEL: Record<SlaPeriod, string> = {
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
};

/** "지난 {기간}" 표현용. */
export const PREV_PERIOD_LABEL: Record<SlaPeriod, string> = {
  today: "어제",
  week: "지난주",
  month: "지난달",
};

/** 갱신 시각 → "방금 업데이트됨 / {n}분 전 업데이트" + stale 여부(>3분). */
export function formatUpdatedAt(
  iso: string | null,
  now: number = Date.now(),
): { text: string; stale: boolean } {
  if (!iso) return { text: "업데이트 정보 없음", stale: true };
  const diffMin = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (diffMin <= 0) return { text: "방금 업데이트됨", stale: false };
  return { text: `${diffMin}분 전 업데이트`, stale: diffMin > 3 };
}

/** 기간 종료까지 남은 일수(회복 여지 카피용). today 는 0. */
export function daysLeftInPeriod(period: SlaPeriod, now: number = Date.now()): number {
  const d = new Date(now);
  if (period === "today") return 0;
  if (period === "week") {
    const mondayIndex = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
    return 6 - mondayIndex;
  }
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - d.getDate());
}

/**
 * 동기부여 배너 선택 (03 §D). 조건 충족 시 1개만, 아니면 null.
 * - 호조(주간 SLA 상승): success
 * - 회복 여지(SLA 하락 & 남은 기간 있음): warning
 */
export function selectMotivation(
  current: number | null,
  prev: number | null,
  period: SlaPeriod,
  now: number = Date.now(),
): { tone: "success" | "warning"; message: string } | null {
  if (current == null || prev == null) return null;
  if (period === "week" && current > prev) {
    return { tone: "success", message: "이번 주, 어제의 나보다 한 걸음 더 갔어요" };
  }
  if (current < prev) {
    const left = daysLeftInPeriod(period, now);
    if (left > 0) {
      return {
        tone: "warning",
        message: `이번 ${PERIOD_LABEL[period]}은 조금 낮지만, 아직 ${left}일 남았어요`,
      };
    }
  }
  return null;
}

/** 시간대 분포에서 피크 1구간(최댓값 시각) 추출. */
export function peakWindow(hourly: { hour: number; completed: number }[]): {
  start: number;
  end: number;
  max: number;
} | null {
  if (hourly.length === 0) return null;
  let max = 0;
  let peakHour = 0;
  for (const b of hourly) {
    if (b.completed > max) {
      max = b.completed;
      peakHour = b.hour;
    }
  }
  if (max === 0) return null;
  return { start: peakHour, end: (peakHour + 1) % 24, max };
}
