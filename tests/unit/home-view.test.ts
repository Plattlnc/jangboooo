import { describe, it, expect } from "vitest";
import { toHomeMetrics } from "@/components/screens/home-view";
import type { DashboardData } from "@/app/(rider)/_lib/queries";

// 피크 4버킷은 배민 원본값(DashboardData.peaks)을 그대로 노출한다 —
// 시간 경계 추정 재집계(구 aggregatePeakBuckets) 금지. hourly 와 달라도 peaks 가 정답.

function fixture(): DashboardData {
  return {
    summary: {
      period: "today", start_date: "2026-07-09", end_date: "2026-07-09",
      admin_rider_id: "R-1", sla_score: 90, completed: 20, rejected: 1,
      dispatch_canceled: 0, delivery_canceled: 0, assigned: 21, acceptance_rate: 95,
      active_days: 1, last_captured_at: "2026-07-09T12:00:00Z",
    },
    previous: null,
    // 일부러 peaks 와 안 맞는 분포 — hourly 로 재집계하지 않음을 검증.
    hourly: [{ hour: 13, completed: 99 }],
    peaks: { morning: 7, afternoon: 3, evening: 12, midnight: 2 },
    riderName: "홍길동",
    centerGoals: [],
  };
}

describe("toHomeMetrics — 피크 4버킷은 원본값 그대로", () => {
  it("고정 라벨 순서로 peaks 값을 매핑(합산/재집계 없음)", () => {
    const m = toHomeMetrics(fixture(), "today");
    expect(m.peaks).toEqual([
      { label: "아침점심", value: 7 },
      { label: "오후", value: 3 },
      { label: "저녁", value: 12 },
      { label: "심야", value: 2 },
    ]);
  });
});
