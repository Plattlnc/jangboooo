import { describe, it, expect } from "vitest";
import { toHomeMetrics } from "@/components/screens/home-view";
import type { DashboardData } from "@/app/(rider)/_lib/queries";

// 피크 4버킷은 배민 원본값(DashboardData.peaks)을 그대로 노출한다 —
// 시간 경계 추정 재집계(구 aggregatePeakBuckets) 금지. hourly 와 달라도 peaks 가 정답.

function fixture(overrides: Partial<DashboardData> = {}): DashboardData {
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
    bmart: null,
    riderName: "홍길동",
    centerGoals: [],
    ...overrides,
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

describe("toHomeMetrics — 일반/B마트 분리", () => {
  it("bmart 보유 시 상태값 = 합계 − B마트, bmart 서브값 첨부", () => {
    const m = toHomeMetrics(
      fixture({ bmart: { complete: 3, reject: 1, cancel: 0, riderFault: 0 } }),
      "today",
    );
    expect(m.status).toEqual([
      { label: "완료", value: 17, bmart: 3, color: "#1E9E5A" },
      { label: "거절", value: 0, bmart: 1, color: "#D9342B" },
      { label: "배차취소", value: 0, bmart: 0, color: "#E8590C" },
      { label: "배달취소", value: 0, bmart: 0, color: "#9b9588" },
    ]);
    // 히어로 배달 건수는 전체 합계 유지(일반+B마트+스토어) — 분리는 운행 상태 타일에서.
    expect(m.count).toBe(20);
  });

  it("bmart 미보유(null)면 합계 그대로 + bmart 필드 없음(서브라인 생략)", () => {
    const m = toHomeMetrics(fixture(), "today");
    expect(m.status[0]).toEqual({ label: "완료", value: 20, color: "#1E9E5A" });
    expect(m.status.every((it) => !("bmart" in it))).toBe(true);
  });

  it("데이터 불일치로 B마트가 합계보다 커도 음수로 내려가지 않음(0 클램프)", () => {
    const m = toHomeMetrics(
      fixture({ bmart: { complete: 99, reject: 0, cancel: 0, riderFault: 0 } }),
      "today",
    );
    expect(m.status[0].value).toBe(0);
    expect(m.status[0].bmart).toBe(99);
  });

  it("수락률은 B마트 분리와 무관하게 요약값(푸드 단독 산식) 그대로", () => {
    const m = toHomeMetrics(
      fixture({ bmart: { complete: 3, reject: 5, cancel: 0, riderFault: 0 } }),
      "today",
    );
    expect(m.accept).toBe(95);
  });

  it("수락률 소수값은 배민 표기와 동일하게 정수 반올림(93.75 → 94)", () => {
    const m = toHomeMetrics(
      fixture({ summary: { ...fixture().summary, acceptance_rate: 93.75 } }),
      "today",
    );
    expect(m.accept).toBe(94);
  });
});
