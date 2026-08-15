import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMissionSettlement } from "@/app/settlement/_lib/mission";
import { fetchPromoSettlement } from "@/app/settlement/_lib/promo";
import { fetchExtraPayments } from "@/app/settlement/_lib/extra";
import { fetchInsuranceForWeek } from "@/app/settlement/_lib/deductions";
import { weekRangeOf } from "@/app/settlement/_lib/dates";

// 금요일 정산 합계 — 주(수~화) 단위로 정산되는 4개 항목을 라이더별로 합산.
// 지급: 본사 미션 + 추가 지급 + 자사 프로모션 / 차감: 시간제보험료. 합계(세전) = 지급 − 차감.

export interface FridayRow {
  riderId: string;
  name: string;
  mission: number; // 본사 미션(세전)
  extra: number; // 추가 지급
  promo: number; // 자사 프로모션(세전)
  insurance: number; // 차감(시간제보험료)
  net: number; // 합계(세전) = mission + extra + promo − insurance
}
export interface FridayWeek {
  start: string;
  end: string;
}
export interface FridayData {
  weekStart: string;
  weekEnd: string;
  rows: FridayRow[];
  weeks: FridayWeek[];
  totals: { mission: number; extra: number; promo: number; insurance: number; net: number };
}

/** 정산 데이터가 있는 주차 목록(최신순) — weekly_revenue 기준(수집된 주정산 주차). */
export async function listSettlementWeeks(): Promise<FridayWeek[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("weekly_revenue")
      .select("week_start, week_end")
      .order("week_start", { ascending: false })
      .limit(200);
    if (error || !data) return [];
    return data.map((r) => ({ start: r.week_start, end: r.week_end }));
  } catch {
    return [];
  }
}

export async function fetchFridaySettlement(weekStart: string): Promise<FridayData> {
  const { start, end } = weekRangeOf(weekStart);
  const [mission, promo, extra, insurance, weeks] = await Promise.all([
    fetchMissionSettlement(start, end),
    fetchPromoSettlement(start, end, true),
    fetchExtraPayments(start),
    fetchInsuranceForWeek(start),
    listSettlementWeeks(),
  ]);

  const map = new Map<string, FridayRow>();
  const get = (id: string, name: string): FridayRow => {
    let r = map.get(id);
    if (!r) {
      r = { riderId: id, name, mission: 0, extra: 0, promo: 0, insurance: 0, net: 0 };
      map.set(id, r);
    }
    if ((!r.name || r.name === r.riderId) && name && name !== id) r.name = name;
    return r;
  };

  for (const m of mission.rows) get(m.riderId, m.name).mission += m.mission;
  for (const p of promo.rows) if (p.gross > 0) get(p.riderId, p.name).promo += p.gross;
  for (const e of extra.rows) get(e.riderId, e.name).extra += e.totalKrw;
  for (const [id, amt] of Object.entries(insurance)) get(id, id).insurance += amt;

  const rows = [...map.values()]
    .map((r) => ({ ...r, net: r.mission + r.extra + r.promo - r.insurance }))
    .filter((r) => r.mission || r.extra || r.promo || r.insurance)
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, "ko"));

  const totals = rows.reduce(
    (t, r) => ({
      mission: t.mission + r.mission,
      extra: t.extra + r.extra,
      promo: t.promo + r.promo,
      insurance: t.insurance + r.insurance,
      net: t.net + r.net,
    }),
    { mission: 0, extra: 0, promo: 0, insurance: 0, net: 0 },
  );

  return { weekStart: start, weekEnd: end, rows, weeks, totals };
}
