import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RiderSummaryRow } from "@/types/database";

// 데이터 접근 레이어(커스텀 세션 인증 모델, #19).
// queries.ts 는 createAdminClient()를 내부에서 호출 → service_role 로 *_for RPC.
// admin 클라이언트를 모킹해 인자 매핑(admin_rider_id 명시) + 에러 전파 + 합성을 검증.

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

const {
  getRiderSummaryFor,
  getRiderDailyFor,
  getRiderHourlyFor,
  getDashboardFor,
} = await import("@/lib/supabase/queries");

const SUMMARY: RiderSummaryRow = {
  period: "week",
  start_date: "2026-06-22",
  end_date: "2026-06-28",
  admin_rider_id: "R-1",
  sla_score: 88,
  completed: 124,
  rejected: 11,
  dispatch_canceled: 6,
  delivery_canceled: 3,
  assigned: 144,
  acceptance_rate: 92.36,
  active_days: 6,
  last_captured_at: "2026-06-28T09:00:00Z",
};

beforeEach(() => rpc.mockReset());

describe("getRiderSummaryFor — RPC 인자 매핑 + 1행 추출", () => {
  it("ref 미지정 시 p_ref=null, data[0] 반환", async () => {
    rpc.mockResolvedValueOnce({ data: [SUMMARY], error: null });
    const row = await getRiderSummaryFor("R-1", "week");
    expect(row).toEqual(SUMMARY);
    expect(rpc).toHaveBeenCalledWith("get_rider_summary_for", {
      p_admin_rider_id: "R-1",
      p_period: "week",
      p_ref: null,
    });
  });

  it("ref 지정 시 그대로 전달", async () => {
    rpc.mockResolvedValueOnce({ data: [SUMMARY], error: null });
    await getRiderSummaryFor("R-1", "today", "2026-06-28");
    expect(rpc).toHaveBeenCalledWith("get_rider_summary_for", {
      p_admin_rider_id: "R-1",
      p_period: "today",
      p_ref: "2026-06-28",
    });
  });

  it("error 면 throw 로 전파", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("QUERY_FAILED") });
    await expect(getRiderSummaryFor("R-1", "week")).rejects.toThrow("QUERY_FAILED");
  });

  it("보안: admin_rider_id 는 인자로 명시 전달된다(세션에서만 유도)", async () => {
    rpc.mockResolvedValueOnce({ data: [SUMMARY], error: null });
    await getRiderSummaryFor("R-7", "month");
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_admin_rider_id).toBe("R-7");
  });
});

describe("getRiderDailyFor / getRiderHourlyFor — 배열 그대로 반환", () => {
  it("daily: data 배열 반환", async () => {
    const rows = [{ snapshot_date: "2026-06-28", completed: 5 }];
    rpc.mockResolvedValueOnce({ data: rows, error: null });
    await expect(getRiderDailyFor("R-1", "today")).resolves.toEqual(rows);
  });

  it("hourly: error 전파", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    await expect(getRiderHourlyFor("R-1", "today")).rejects.toThrow("boom");
  });
});

describe("getDashboardFor — 요약+일별+시간대 합성", () => {
  it("기간별로 3개 RPC 호출 + 합성", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_rider_summary_for") return { data: [SUMMARY], error: null };
      if (name === "get_rider_daily_for") return { data: [{ snapshot_date: "2026-06-28" }], error: null };
      if (name === "get_rider_hourly_for") return { data: [{ hour: 18, completed: 11 }], error: null };
      return { data: null, error: new Error("unknown rpc") };
    });
    const res = await getDashboardFor("R-1", "week", "2026-06-28");
    expect(res.period).toBe("week");
    expect(res.summary).toEqual(SUMMARY);
    expect(res.daily).toHaveLength(1);
    expect(res.hourly).toEqual([{ hour: 18, completed: 11 }]);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("하위 RPC 하나라도 실패하면 전체 실패(Promise.all)", async () => {
    rpc.mockImplementation(async (name: string) =>
      name === "get_rider_daily_for"
        ? { data: null, error: new Error("daily failed") }
        : { data: name === "get_rider_summary_for" ? [SUMMARY] : [], error: null },
    );
    await expect(getDashboardFor("R-1", "today")).rejects.toThrow("daily failed");
  });
});
