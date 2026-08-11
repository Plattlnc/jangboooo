import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 일일 정산 데이터 — 선택 영업일의 라이더별 배달처리비(세전) + 미션 + 완료건수.
// 원천: rider_daily_fees(0018). 라이더명/연락처는 riders 조인. 정산팀 송금 목록의 기반.

export interface DailySettlementRow {
  riderId: string;
  name: string;
  phone: string | null;
  completed: number;
  /** 배달처리비(세전, 전달완료 + 무귀책 배달취소) */
  fee: number;
  /** 본사 미션 지급액 */
  mission: number;
  /** 당일 총 지급(배달처리비 + 미션) */
  total: number;
}

export interface DailySettlement {
  date: string;
  rows: DailySettlementRow[];
  totals: { riders: number; completed: number; fee: number; mission: number; total: number };
}

/** 선택 영업일(YYYY-MM-DD)의 라이더별 일일 정산 내역. 데이터 없으면 rows 빈 배열. */
export async function fetchDailySettlement(date: string): Promise<DailySettlement> {
  const supabase = createAdminClient();

  const { data: fees, error } = await supabase
    .from("rider_daily_fees")
    .select("admin_rider_id, fee_krw, mission_krw, completed_cnt")
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
    return {
      riderId: f.admin_rider_id,
      name: meta?.name ?? f.admin_rider_id,
      phone: meta?.phone ?? null,
      completed: f.completed_cnt,
      fee: f.fee_krw,
      mission: f.mission_krw,
      total: f.fee_krw + f.mission_krw,
    };
  });
  rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ko"));

  const totals = rows.reduce(
    (acc, r) => {
      acc.completed += r.completed;
      acc.fee += r.fee;
      acc.mission += r.mission;
      acc.total += r.total;
      return acc;
    },
    { riders: rows.length, completed: 0, fee: 0, mission: 0, total: 0 },
  );

  return { date, rows, totals };
}
