import { describe, it, expect } from "vitest";
import {
  aggregateByDate,
  aggregateByRider,
  aggregateTotals,
  sliceRange,
  type AdminSnapshotRow,
} from "@/lib/admin/aggregate";

// 관리자 집계 — 수락률(푸드 공식)/거절률/B마트 합산/가중 SLA/기간 슬라이스 검증.

function row(overrides: Partial<AdminSnapshotRow> = {}): AdminSnapshotRow {
  return {
    admin_rider_id: "R-1",
    snapshot_date: "2026-07-18",
    sla_score: 90,
    completed: 10,
    rejected: 2,
    dispatch_canceled: 1,
    delivery_canceled: 0,
    assigned: 13,
    acceptance_rate: 76.92,
    peak_morning: 3,
    peak_afternoon: 2,
    peak_evening: 4,
    peak_midnight: 1,
    breakdown: {
      food: { complete: 8, reject: 2, cancel: 1, riderFault: 0 },
      bmart: { complete: 2, reject: 0, cancel: 0, riderFault: 0 },
      store: { complete: 0, reject: 0, cancel: 0, riderFault: 0 },
    },
    captured_at: "2026-07-18T12:00:00Z",
    ...overrides,
  };
}

describe("aggregateTotals", () => {
  it("수락률 = 푸드 공식(완료/완료+거절+취소+귀책), 거절률 = 같은 분모", () => {
    // 푸드 30/32 (오균식 케이스): 완료 30, 거절 2 → 93.75% / 6.25%
    const t = aggregateTotals([
      row({
        breakdown: {
          food: { complete: 30, reject: 2, cancel: 0, riderFault: 0 },
          bmart: { complete: 5, reject: 3, cancel: 0, riderFault: 0 },
          store: { complete: 0, reject: 0, cancel: 0, riderFault: 0 },
        },
      }),
    ]);
    // B마트 거절 3건은 분모에 포함되지 않음(푸드 단독).
    expect(t.acceptanceRate).toBe(93.75);
    expect(t.rejectionRate).toBe(6.25);
  });

  it("B마트 세부는 별도 합산되고 합계(completed)에는 원본 그대로 반영", () => {
    const t = aggregateTotals([row(), row({ admin_rider_id: "R-2" })]);
    expect(t.completed).toBe(20);
    expect(t.bmart.complete).toBe(4);
    expect(t.food.complete).toBe(16);
  });

  it("breakdown 전무 시 수락률은 저장된 일별 acceptance_rate 평균 폴백(RPC 0011 동일)", () => {
    const t = aggregateTotals([
      row({ breakdown: null, acceptance_rate: 80 }),
      row({ breakdown: null, acceptance_rate: 90, admin_rider_id: "R-2" }),
    ]);
    expect(t.acceptanceRate).toBe(85);
    expect(t.rejectionRate).toBeNull();
  });

  it("SLA 점수는 completed 가중 평균", () => {
    const t = aggregateTotals([
      row({ sla_score: 100, completed: 30 }),
      row({ sla_score: 50, completed: 10, admin_rider_id: "R-2" }),
    ]);
    expect(t.slaScore).toBe(87.5); // (100*30 + 50*10) / 40
  });

  it("activeRiders = assigned>0 인 라이더 distinct 수", () => {
    const t = aggregateTotals([
      row(),
      row({ snapshot_date: "2026-07-17" }), // 같은 라이더 이틀 → 1명
      row({ admin_rider_id: "R-2", assigned: 0, completed: 0 }),
    ]);
    expect(t.activeRiders).toBe(1);
  });

  it("빈 배열 → 0 합계 + null 지표", () => {
    const t = aggregateTotals([]);
    expect(t.completed).toBe(0);
    expect(t.acceptanceRate).toBeNull();
    expect(t.slaScore).toBeNull();
    expect(t.lastCapturedAt).toBeNull();
    expect(t.activeRiders).toBe(0);
  });
});

describe("aggregateByRider / aggregateByDate / sliceRange", () => {
  const rows = [
    row({ admin_rider_id: "A", snapshot_date: "2026-07-17", completed: 5 }),
    row({ admin_rider_id: "A", snapshot_date: "2026-07-18", completed: 7 }),
    row({ admin_rider_id: "B", snapshot_date: "2026-07-18", completed: 20 }),
  ];

  it("라이더별: completed 내림차순 + activeDays", () => {
    const by = aggregateByRider(rows);
    expect(by.map((r) => r.adminRiderId)).toEqual(["B", "A"]);
    expect(by[1].completed).toBe(12);
    expect(by[1].activeDays).toBe(2);
  });

  it("일별: 날짜 오름차순 합산", () => {
    const by = aggregateByDate(rows);
    expect(by.map((d) => d.date)).toEqual(["2026-07-17", "2026-07-18"]);
    expect(by[1].completed).toBe(27);
  });

  it("sliceRange: 경계 포함 필터", () => {
    expect(sliceRange(rows, "2026-07-18", "2026-07-18")).toHaveLength(2);
    expect(sliceRange(rows, "2026-07-01", "2026-07-17")).toHaveLength(1);
  });
});
