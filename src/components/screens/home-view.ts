// 실데이터(getDashboardData) → 홈 화면 뷰모델 매핑. 서버에서 호출(순수 함수, 서버 의존 없음).
//
// 매핑 가능: 완료건수·수락률·상태4분류·피크4버킷·공동목표(current/goal/pct).
// 소스 없음: 매출(revenue)·카테고리(cats) → 빈 값(화면 미표시). 가점 배지(badge) → 생략.

import { aggregatePeakBuckets, formatUpdatedAt } from "@/app/(rider)/_lib/metrics";
import type { DashboardData } from "@/app/(rider)/_lib/queries";
import type { HomeMetrics, GoalIcon } from "@/lib/mock/home";

const GOAL_ICONS: GoalIcon[] = ["dawn", "noon", "evening", "night"];
const PEAK_LABELS = ["아침점심", "오후", "저녁", "심야"];

/** 'YYYY-MM-DD' → 'MM.DD' */
function mmdd(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${m}.${d}`;
}

export interface HomeProfile {
  name: string;
  initial: string;
  uid: string;
  /** 마지막 수집이 신선(≤3분)하면 실시간으로 표기. */
  isLive: boolean;
}

export function toHomeProfile(data: DashboardData): HomeProfile {
  const name = data.riderName ?? "라이더";
  return {
    name,
    initial: name.trim().slice(0, 1) || "라",
    uid: data.summary.admin_rider_id ?? "—",
    isLive: !formatUpdatedAt(data.summary.last_captured_at).stale,
  };
}

export function toHomeMetrics(data: DashboardData, period: "today" | "week"): HomeMetrics {
  const s = data.summary;
  const buckets = aggregatePeakBuckets(data.hourly);

  return {
    period:
      period === "today"
        ? `${s.start_date} 기준`
        : `${s.start_date.replaceAll("-", ".")} ~ ${mmdd(s.end_date)} · 주간 합계`,
    count: s.completed,
    revenue: 0, // 소스 없음 — 미표시
    accept: s.acceptance_rate ?? 0,
    status: [
      { label: "완료", value: s.completed, color: "#1E9E5A" },
      { label: "거절", value: s.rejected, color: "#D9342B" },
      { label: "배차취소", value: s.dispatch_canceled, color: "#E8590C" },
      { label: "배달취소", value: s.delivery_canceled, color: "#9b9588" },
    ],
    cats: [], // 소스 없음 — 미표시
    peaks: buckets.map((b, i) => ({ label: PEAK_LABELS[i] ?? b.label, value: b.count })),
    goals: data.centerGoals.slice(0, 4).map((g, i) => ({
      label: g.label,
      actual: g.current ?? 0,
      target: g.goal ?? 0,
      pct: g.pct,
      icon: GOAL_ICONS[g.peak_order] ?? GOAL_ICONS[i] ?? "dawn",
    })),
  };
}

/** 오늘/주간 두 기간의 날짜 단축 표기(히어로 우상단 칩). */
export function homeDateShort(data: DashboardData, period: "today" | "week"): string {
  const s = data.summary;
  return period === "today" ? s.start_date : `${mmdd(s.start_date)} ~ ${mmdd(s.end_date)}`;
}
