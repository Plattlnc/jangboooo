import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDeductions, PER_COMPLETED_FEE } from "@/app/settlement/_lib/rates";

// 일일 정산 데이터 — 선택 영업일의 라이더별 배달처리비(세전)에서 원천세(3.3%)·고용산재(1.8%)
// + 수수료(완료건당 100원) 공제 후 지급액. 미션비는 일일정산 대상 아님(제외). 원천: rider_daily_fees(0018).

export interface DailySettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  completed: number;
  /** 배달처리비(세전, 전달완료 + 무귀책 배달취소) */
  fee: number;
  feeWht: number;
  feeIns: number;
  /** 수수료 = 완료건수 × PER_COMPLETED_FEE */
  feeFee: number;
  /** 지급액 = 세전 − 원천세 − 고용산재 − 수수료 */
  feePayout: number;
  /** 총 지급액(= 배달처리비 지급액, 미션 제외) */
  total: number;
}

export interface DailyTotals {
  riders: number;
  completed: number;
  fee: number;
  feeWht: number;
  feeIns: number;
  feeFee: number;
  feePayout: number;
  total: number;
}

export interface DailySettlement {
  date: string;
  rows: DailySettlementRow[];
  totals: DailyTotals;
}

const NUMERIC_KEYS: (keyof DailyTotals & keyof DailySettlementRow)[] = [
  "completed",
  "fee",
  "feeWht",
  "feeIns",
  "feeFee",
  "feePayout",
  "total",
];

/** 선택 영업일(YYYY-MM-DD)의 라이더별 일일 정산 내역. 데이터 없으면 rows 빈 배열. */
export async function fetchDailySettlement(date: string): Promise<DailySettlement> {
  const supabase = createAdminClient();

  const { data: fees, error } = await supabase
    .from("rider_daily_fees")
    .select("admin_rider_id, fee_krw, completed_cnt")
    .eq("snapshot_date", date);
  if (error) throw new Error(`rider_daily_fees 조회 실패: ${error.message}`);

  const feeRows = fees ?? [];
  const ids = feeRows.map((f) => f.admin_rider_id);

  const info = new Map<string, { name: string | null; phone: string | null }>();
  if (ids.length > 0) {
    const { data: riders } = await supabase
      .from("riders")
      .select("admin_rider_id, name, phone")
      .in("admin_rider_id", ids);
    for (const r of riders ?? []) info.set(r.admin_rider_id, { name: r.name, phone: r.phone });
  }

  const rows: DailySettlementRow[] = feeRows.map((f) => {
    const meta = info.get(f.admin_rider_id);
    // 수수료 = 완료건수 × 100원(배달처리비에만).
    const d = applyDeductions(f.fee_krw, f.completed_cnt * PER_COMPLETED_FEE);
    return {
      riderId: f.admin_rider_id,
      name: meta?.name ?? f.admin_rider_id,
      phone: meta?.phone ?? null,
      completed: f.completed_cnt,
      fee: f.fee_krw,
      feeWht: d.wht,
      feeIns: d.ins,
      feeFee: d.fee,
      feePayout: d.payout,
      total: d.payout,
    };
  });
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ko"));

  const totals: DailyTotals = { riders: rows.length, completed: 0, fee: 0, feeWht: 0, feeIns: 0, feeFee: 0, feePayout: 0, total: 0 };
  for (const r of rows) {
    for (const k of NUMERIC_KEYS) totals[k] += r[k];
  }

  return { date, rows, totals };
}
