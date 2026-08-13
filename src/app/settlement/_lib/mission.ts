import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDeductions, PER_COMPLETED_FEE } from "@/app/settlement/_lib/rates";

// 본사 미션 정산 데이터 — 선택 영업일의 라이더별 본사 미션 지급액(세전, mission_krw)에서
// 원천세(3.3%)·고용산재(1.8%) + 수수료(완료건당 100원) 공제 후 지급액.
// 원천: rider_daily_fees(0018). 미션이 있는(>0) 라이더만 집계.

export interface MissionSettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  completed: number;
  /** 본사 미션 지급액(세전) */
  mission: number;
  wht: number;
  ins: number;
  /** 수수료 = 완료건수 × PER_COMPLETED_FEE */
  fee: number;
  /** 지급액 = 세전 − 원천세 − 고용산재 − 수수료 */
  payout: number;
}

export interface MissionTotals {
  riders: number;
  completed: number;
  mission: number;
  wht: number;
  ins: number;
  fee: number;
  payout: number;
}

export interface MissionSettlement {
  start: string;
  end: string;
  rows: MissionSettlementRow[];
  totals: MissionTotals;
}

const NUMERIC_KEYS: (keyof MissionTotals & keyof MissionSettlementRow)[] = [
  "completed",
  "mission",
  "wht",
  "ins",
  "fee",
  "payout",
];

/**
 * 기간(start~end, 포함) 라이더별 본사 미션 정산 내역 — 라이더별로 기간 합산(미션·완료건수) 후
 * 원천세·고용산재 + 수수료(완료건당 100원)를 합산 기준으로 공제. 일일 정산은 start=end.
 * 데이터 없으면 rows 빈 배열.
 */
export async function fetchMissionSettlement(start: string, end: string = start): Promise<MissionSettlement> {
  const supabase = createAdminClient();

  const { data: fees, error } = await supabase
    .from("rider_daily_fees")
    .select("admin_rider_id, mission_krw, completed_cnt")
    .gte("snapshot_date", start)
    .lte("snapshot_date", end);
  if (error) throw new Error(`rider_daily_fees 조회 실패: ${error.message}`);

  // 라이더별 기간 합산.
  const agg = new Map<string, { mission: number; completed: number }>();
  for (const f of fees ?? []) {
    const cur = agg.get(f.admin_rider_id) ?? { mission: 0, completed: 0 };
    cur.mission += f.mission_krw ?? 0;
    cur.completed += f.completed_cnt ?? 0;
    agg.set(f.admin_rider_id, cur);
  }
  const ids = [...agg.entries()].filter(([, v]) => v.mission > 0).map(([id]) => id); // 미션 지급분만

  const info = new Map<string, { name: string | null; phone: string | null }>();
  if (ids.length > 0) {
    const { data: riders } = await supabase
      .from("riders")
      .select("admin_rider_id, name, phone")
      .in("admin_rider_id", ids);
    for (const r of riders ?? []) info.set(r.admin_rider_id, { name: r.name, phone: r.phone });
  }

  const rows: MissionSettlementRow[] = ids.map((id) => {
    const v = agg.get(id)!;
    const meta = info.get(id);
    // 수수료 = 기간 완료건수 × 100원. 공제는 기간 합산 기준으로 1회 산출.
    const d = applyDeductions(v.mission, v.completed * PER_COMPLETED_FEE);
    return {
      riderId: id,
      name: meta?.name ?? id,
      phone: meta?.phone ?? null,
      completed: v.completed,
      mission: v.mission,
      wht: d.wht,
      ins: d.ins,
      fee: d.fee,
      payout: d.payout,
    };
  });
  rows.sort((a, b) => b.payout - a.payout || a.name.localeCompare(b.name, "ko"));

  const totals: MissionTotals = { riders: rows.length, completed: 0, mission: 0, wht: 0, ins: 0, fee: 0, payout: 0 };
  for (const r of rows) {
    for (const k of NUMERIC_KEYS) totals[k] += r[k];
  }

  return { start, end, rows, totals };
}
