import { NextResponse, type NextRequest } from "next/server";
import { isSettlementSession } from "@/lib/auth/settlement-cookies";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// 정산 데이터 신선도 — 소스 테이블의 최신 captured_at 1개만 반환(DataPulse 폴링용).
// 미들웨어(/settlement/*)에 더해 세션 이중 확인. 경량: order+limit 1 (인덱스 스캔).
const SOURCES = {
  daily: { table: "rider_daily_fees", col: "captured_at" },
  hourly: { table: "rider_hourly_stats", col: "captured_at" },
  extra: { table: "rider_extra_payments", col: "captured_at" },
  insurance: { table: "rider_weekly_insurance", col: "captured_at" },
  revenue: { table: "weekly_revenue", col: "captured_at" },
  contract: { table: "rider_contract_status", col: "captured_at" },
} as const;

type SourceKey = keyof typeof SOURCES;

export async function GET(request: NextRequest) {
  if (!(await isSettlementSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const src = request.nextUrl.searchParams.get("src") as SourceKey | null;
  const def = src ? SOURCES[src] : undefined;
  if (!def) return NextResponse.json({ error: "unknown source" }, { status: 400 });

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from(def.table)
      .select(def.col)
      .order(def.col, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const ts = (data as Record<string, string> | null)?.[def.col] ?? null;
    return NextResponse.json({ ts }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // 테이블 미생성(0024 미적용 등) 포함 — 표시만 조용히 비활성.
    return NextResponse.json({ ts: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
