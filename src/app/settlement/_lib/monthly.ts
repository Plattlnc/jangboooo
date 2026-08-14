import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadRiderRrns } from "@/app/settlement/_lib/notes";
import { loadPromoRules, promoForWeek } from "@/app/settlement/_lib/promo-rules";
import { monthWeeks } from "@/app/settlement/_lib/dates";

// 월 소득정산서(세무사용) — 라이더별 × 주차별(수~화) 세전 소득 통합.
//   배달처리비(세전) = 주간 fee_krw 합
//   기타/인센티브(세전) = 본사미션(mission_krw) + 자사프로모션(주간 09~00시 100건 초과분 × 2,000)
//   소득합계 = Σ(배달처리비 + 기타/인센티브)
// 주차: dates.monthWeeks — 주 시작(수요일)이 속한 달로 귀속(1일이 있어도 수요일이 전월이면 전월 주차). 원천세 등 공제 전(세전) 금액.

export interface MonthlyWeekCell {
  delivery: number; // 배달처리비(세전)
  etc: number; // 기타/인센티브(세전) = 미션 + 프로모션
}

export interface MonthlyRow {
  riderId: string;
  name: string;
  rrn: string; // 주민등록번호(평문, 복호화)
  weeks: MonthlyWeekCell[]; // length = weeks.length
  total: number; // 소득합계금액
}

export interface MonthlySettlement {
  ym: string;
  weeks: { start: string; end: string }[];
  rows: MonthlyRow[];
  totals: {
    perWeek: MonthlyWeekCell[];
    delivery: number; // 총 배달처리비(세전)
    mission: number; // 총 본사미션(세전)
    promo: number; // 총 자사프로모션(세전)
    total: number; // 소득합계 = delivery + mission + promo
  };
}

function dayNum(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** 카운트 기반 페이지드 fetch(동시성 제한). PostgREST 1,000행 제한 방어 — 정산 소스 공용. */
export async function paginate<T>(makeBase: () => PromiseLike<{ data: T[] | null; error: unknown }>, makeCount: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<T[]> {
  const BATCH = 1000;
  const CONC = 8;
  const { count, error } = await makeCount();
  if (error) throw new Error(String((error as { message?: string }).message ?? error));
  const pages = Math.max(1, Math.ceil((count ?? 0) / BATCH));
  const out: T[] = [];
  for (let i = 0; i < pages; i += CONC) {
    const slice = Array.from({ length: Math.min(CONC, pages - i) }, (_, j) => {
      const p = i + j;
      // makeBase() 는 range 를 붙일 수 있는 쿼리 빌더를 반환.
      return (makeBase() as unknown as { range: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }> }).range(p * BATCH, (p + 1) * BATCH - 1);
    });
    const results = await Promise.all(slice);
    for (const r of results) {
      if (r.error) throw new Error(String((r.error as { message?: string }).message ?? r.error));
      out.push(...(r.data ?? []));
    }
  }
  return out;
}

export async function fetchMonthlySettlement(ym: string): Promise<MonthlySettlement> {
  const weeks = monthWeeks(ym);
  if (weeks.length === 0) {
    return { ym, weeks, rows: [], totals: { perWeek: [], delivery: 0, mission: 0, promo: 0, total: 0 } };
  }

  const start = weeks[0].start;
  const end = weeks[weeks.length - 1].end;
  const base = dayNum(start);
  const widx = (date: string): number => {
    const i = Math.floor((dayNum(date) - base) / 7);
    return i >= 0 && i < weeks.length ? i : -1;
  };

  const supabase = createAdminClient();

  // 배달처리비 + 본사미션(rider_daily_fees)
  const feeRows = await paginate<{ admin_rider_id: string; snapshot_date: string; fee_krw: number; mission_krw: number }>(
    () =>
      supabase
        .from("rider_daily_fees")
        .select("admin_rider_id, snapshot_date, fee_krw, mission_krw")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end)
        .order("snapshot_date", { ascending: true })
        .order("admin_rider_id", { ascending: true }) as never,
    () =>
      supabase
        .from("rider_daily_fees")
        .select("admin_rider_id", { count: "exact", head: true })
        .gte("snapshot_date", start)
        .lte("snapshot_date", end) as never,
  );

  // 완료건(rider_hourly_stats, 전체 시간) — op=09~00시, daily=일일 전체
  const hourRows = await paginate<{ admin_rider_id: string; snapshot_date: string; hour: number; completed: number }>(
    () =>
      supabase
        .from("rider_hourly_stats")
        .select("admin_rider_id, snapshot_date, hour, completed")
        .gte("snapshot_date", start)
        .lte("snapshot_date", end)
        .gt("completed", 0)
        .order("snapshot_date", { ascending: true })
        .order("admin_rider_id", { ascending: true })
        .order("hour", { ascending: true }) as never,
    () =>
      supabase
        .from("rider_hourly_stats")
        .select("admin_rider_id", { count: "exact", head: true })
        .gte("snapshot_date", start)
        .lte("snapshot_date", end)
        .gt("completed", 0) as never,
  );

  type Agg = { fee: number[]; mission: number[]; op: number[]; daily: number[] };
  const agg = new Map<string, Agg>();
  const ensure = (id: string): Agg => {
    let a = agg.get(id);
    if (!a) {
      a = {
        fee: Array(weeks.length).fill(0),
        mission: Array(weeks.length).fill(0),
        op: Array(weeks.length).fill(0),
        daily: Array(weeks.length).fill(0),
      };
      agg.set(id, a);
    }
    return a;
  };
  for (const r of feeRows) {
    const i = widx(r.snapshot_date);
    if (i < 0) continue;
    const a = ensure(r.admin_rider_id);
    a.fee[i] += r.fee_krw ?? 0;
    a.mission[i] += r.mission_krw ?? 0;
  }
  for (const r of hourRows) {
    const i = widx(r.snapshot_date);
    if (i < 0) continue;
    const a = ensure(r.admin_rider_id);
    const c = r.completed ?? 0;
    a.daily[i] += c;
    if ((r.hour ?? 0) >= 9) a.op[i] += c;
  }

  const ids = [...agg.keys()];
  const info = new Map<string, string | null>();
  if (ids.length > 0) {
    const { data: riders } = await supabase.from("riders").select("admin_rider_id, name").in("admin_rider_id", ids);
    for (const r of riders ?? []) info.set(r.admin_rider_id, r.name);
  }
  const rrns = await loadRiderRrns();

  const rules = await loadPromoRules();
  let gDelivery = 0; // 배달처리비(fee)
  let gMission = 0; // 본사미션
  let gPromo = 0; // 자사프로모션
  const rows: MonthlyRow[] = ids
    .map((id) => {
      const a = agg.get(id)!;
      const cells: MonthlyWeekCell[] = weeks.map((w, i) => {
        const delivery = a.fee[i] + a.mission[i]; // 배달처리비 = 배달처리비 + 본사미션
        const promo = promoForWeek(rules[w.start], a.op[i], a.daily[i]); // 기타/인센티브 = 자사프로모션(주차 규칙·기준)
        return { delivery, etc: promo };
      });
      const total = cells.reduce((s, c) => s + c.delivery + c.etc, 0);
      if (total > 0) {
        for (let i = 0; i < weeks.length; i++) {
          gDelivery += a.fee[i];
          gMission += a.mission[i];
          gPromo += promoForWeek(rules[weeks[i].start], a.op[i], a.daily[i]);
        }
      }
      return { riderId: id, name: info.get(id) ?? id, rrn: rrns[id] ?? "", weeks: cells, total };
    })
    .filter((r) => r.total > 0);
  rows.sort((a, b) => a.name.localeCompare(b.name, "ko") || a.riderId.localeCompare(b.riderId));

  const perWeek: MonthlyWeekCell[] = weeks.map((_, i) => ({
    delivery: rows.reduce((s, r) => s + r.weeks[i].delivery, 0),
    etc: rows.reduce((s, r) => s + r.weeks[i].etc, 0),
  }));

  return {
    ym,
    weeks,
    rows,
    totals: { perWeek, delivery: gDelivery, mission: gMission, promo: gPromo, total: gDelivery + gMission + gPromo },
  };
}
