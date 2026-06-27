import { describe, it, expect, vi } from "vitest";
import {
  getRiderSummary,
  getRiderDaily,
  getRiderHourly,
  getDashboard,
  getBindingStatus,
  type Client,
} from "@/lib/supabase/queries";
import type { RiderSummaryRow } from "@/types/database";

// 데이터 접근 레이어. Supabase 클라이언트를 페이크로 주입해 인자 매핑 + 에러 전파 +
// RLS 가정(클라이언트가 타 라이더 데이터를 요청할 수 없음)을 검증.

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

type RpcResult = { data: unknown; error: unknown };

function makeRpcClient(handler: (name: string, args: Record<string, unknown>) => RpcResult) {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => handler(name, args));
  return { client: { rpc } as unknown as Client, rpc };
}

describe("getRiderSummary — RPC 인자 매핑 + 1행 추출", () => {
  it("ref 미지정 시 p_ref=null, data[0] 반환", async () => {
    const { client, rpc } = makeRpcClient(() => ({ data: [SUMMARY], error: null }));
    const row = await getRiderSummary(client, "week");
    expect(row).toEqual(SUMMARY);
    expect(rpc).toHaveBeenCalledWith("get_rider_summary", { p_period: "week", p_ref: null });
  });

  it("ref 지정 시 그대로 전달", async () => {
    const { rpc, client } = makeRpcClient(() => ({ data: [SUMMARY], error: null }));
    await getRiderSummary(client, "today", "2026-06-28");
    expect(rpc).toHaveBeenCalledWith("get_rider_summary", { p_period: "today", p_ref: "2026-06-28" });
  });

  it("error 면 throw 로 전파", async () => {
    const { client } = makeRpcClient(() => ({ data: null, error: new Error("QUERY_FAILED") }));
    await expect(getRiderSummary(client, "week")).rejects.toThrow("QUERY_FAILED");
  });

  it("RLS 가정: 호출 인자에 admin_rider_id 가 없다(본인 데이터는 서버 RLS 가 결정)", async () => {
    const { rpc, client } = makeRpcClient(() => ({ data: [SUMMARY], error: null }));
    await getRiderSummary(client, "month");
    const args = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(args).sort()).toEqual(["p_period", "p_ref"]);
    expect(JSON.stringify(args)).not.toContain("rider_id");
  });
});

describe("getRiderDaily / getRiderHourly — 배열 그대로 반환", () => {
  it("daily: data 배열 반환", async () => {
    const rows = [{ snapshot_date: "2026-06-28", completed: 5 }];
    const { client } = makeRpcClient(() => ({ data: rows, error: null }));
    await expect(getRiderDaily(client, "today")).resolves.toEqual(rows);
  });

  it("hourly: error 전파", async () => {
    const { client } = makeRpcClient(() => ({ data: null, error: new Error("boom") }));
    await expect(getRiderHourly(client, "today")).rejects.toThrow("boom");
  });
});

describe("getDashboard — 요약+일별+시간대 합성", () => {
  it("period 별로 3개 RPC 를 호출하고 결과를 합친다", async () => {
    const { client, rpc } = makeRpcClient((name) => {
      if (name === "get_rider_summary") return { data: [SUMMARY], error: null };
      if (name === "get_rider_daily") return { data: [{ snapshot_date: "2026-06-28" }], error: null };
      if (name === "get_rider_hourly") return { data: [{ hour: 18, completed: 11 }], error: null };
      return { data: null, error: new Error("unknown rpc") };
    });
    const res = await getDashboard(client, "week", "2026-06-28");
    expect(res.period).toBe("week");
    expect(res.summary).toEqual(SUMMARY);
    expect(res.daily).toHaveLength(1);
    expect(res.hourly).toEqual([{ hour: 18, completed: 11 }]);
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it("하위 RPC 하나라도 실패하면 전체 실패(Promise.all)", async () => {
    const { client } = makeRpcClient((name) =>
      name === "get_rider_daily"
        ? { data: null, error: new Error("daily failed") }
        : { data: name === "get_rider_summary" ? [SUMMARY] : [], error: null },
    );
    await expect(getDashboard(client, "today")).rejects.toThrow("daily failed");
  });
});

describe("getBindingStatus — 바인딩 상태", () => {
  function makeFromClient(accounts: RpcResult, riders: RpcResult) {
    const client = {
      from: (table: string) => {
        const result = table === "rider_accounts" ? accounts : riders;
        const builder: Record<string, unknown> = {};
        builder.select = () => builder;
        builder.eq = () => builder;
        builder.maybeSingle = async () => result;
        return builder;
      },
    } as unknown as Client;
    return client;
  }

  it("계정 바인딩 없음 → bound:false", async () => {
    const client = makeFromClient({ data: null, error: null }, { data: null, error: null });
    await expect(getBindingStatus(client)).resolves.toEqual({
      bound: false,
      adminRiderId: null,
      riderName: null,
    });
  });

  it("계정 + 라이더명 있음 → bound:true + 이름", async () => {
    const client = makeFromClient(
      { data: { admin_rider_id: "R-1" }, error: null },
      { data: { name: "홍길동" }, error: null },
    );
    await expect(getBindingStatus(client)).resolves.toEqual({
      bound: true,
      adminRiderId: "R-1",
      riderName: "홍길동",
    });
  });

  it("계정은 있으나 라이더 행 없음 → riderName null (RLS 로 명단 비가시 가능)", async () => {
    const client = makeFromClient(
      { data: { admin_rider_id: "R-9" }, error: null },
      { data: null, error: null },
    );
    await expect(getBindingStatus(client)).resolves.toEqual({
      bound: true,
      adminRiderId: "R-9",
      riderName: null,
    });
  });

  it("계정 조회 에러 → throw", async () => {
    const client = makeFromClient(
      { data: null, error: new Error("rls denied") },
      { data: null, error: null },
    );
    await expect(getBindingStatus(client)).rejects.toThrow("rls denied");
  });
});
