import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDeductions } from "@/app/settlement/_lib/rates";

// 본사 미션 정산 데이터 — 선택 기간의 라이더별 본사 미션 지급액(세전, mission_krw)에서
// 원천세(3.3%)·고용산재(1.8%) 공제 후 지급액. 수수료(완료건당 100원)는 미적용.
// 원천: rider_daily_fees(0018). 미션이 있는(>0) 라이더만 집계.

export interface MissionSettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  /** 본사 미션 지급액(세전) */
  mission: number;
  wht: number;
  ins: number;
  /** 지급액 = 세전 − 원천세 − 고용산재 */
  payout: number;
}

export interface MissionTotals {
  riders: number;
  mission: number;
  wht: number;
  ins: number;
  payout: number;
}

export interface MissionSettlement {
  start: string;
  end: string;
  rows: MissionSettlementRow[];
  totals: MissionTotals;
}

const NUMERIC_KEYS: (keyof MissionTotals & keyof MissionSettlementRow)[] = ["mission", "wht", "ins", "payout"];

/**
 * 기간(start~end, 포함) 라이더별 본사 미션 정산 내역 — 라이더별로 기간 미션 합산 후
 * 원천세·고용산재를 합산 기준으로 공제(수수료 미적용). 일일 정산은 start=end.
 * 데이터 없으면 rows 빈 배열.
 */
export async function fetchMissionSettlement(start: string, end: string = start): Promise<MissionSettlement> {
  const supabase = createAdminClient();

  const { data: fees, error } = await supabase
    .from("rider_daily_fees")
    .select("admin_rider_id, mission_krw")
    .gte("snapshot_date", start)
    .lte("snapshot_date", end);
  if (error) throw new Error(`rider_daily_fees 조회 실패: ${error.message}`);

  // 라이더별 기간 미션 합산.
  const agg = new Map<string, number>();
  for (const f of fees ?? []) {
    agg.set(f.admin_rider_id, (agg.get(f.admin_rider_id) ?? 0) + (f.mission_krw ?? 0));
  }
  const ids = [...agg.entries()].filter(([, m]) => m > 0).map(([id]) => id); // 미션 지급분만

  const info = new Map<string, { name: string | null; phone: string | null }>();
  if (ids.length > 0) {
    const { data: riders } = await supabase
      .from("riders")
      .select("admin_rider_id, name, phone")
      .in("admin_rider_id", ids);
    for (const r of riders ?? []) info.set(r.admin_rider_id, { name: r.name, phone: r.phone });
  }

  const rows: MissionSettlementRow[] = ids.map((id) => {
    const mission = agg.get(id)!;
    const meta = info.get(id);
    const d = applyDeductions(mission, 0); // 수수료 미적용
    return {
      riderId: id,
      name: meta?.name ?? id,
      phone: meta?.phone ?? null,
      mission,
      wht: d.wht,
      ins: d.ins,
      payout: d.payout,
    };
  });
  rows.sort((a, b) => b.payout - a.payout || a.name.localeCompare(b.name, "ko"));

  const totals: MissionTotals = { riders: rows.length, mission: 0, wht: 0, ins: 0, payout: 0 };
  for (const r of rows) {
    for (const k of NUMERIC_KEYS) totals[k] += r[k];
  }

  return { start, end, rows, totals };
}
