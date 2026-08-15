import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 매출(세금계산서 기준) — grider 주정산서 갑지 "3.세금계산서 내역"(역발행) 적재분(weekly_tax_invoice, 0030).
// 배달료·라이더수수료·관리비·정산수수료 페이백·합계 각 공급가액/부가세/공급대가.

export interface TaxLine {
  supply: number;
  vat: number;
  total: number;
}
export interface SalesWeek {
  weekStart: string;
  weekEnd: string;
  delivery: TaxLine;
  riderFee: TaxLine;
  mgmt: TaxLine;
  payback: TaxLine;
  sum: TaxLine;
}
export interface SalesData {
  weeks: SalesWeek[]; // 최신순
}

export async function fetchSales(): Promise<SalesData> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("weekly_tax_invoice")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(200);
    if (error || !data) return { weeks: [] };
    const weeks: SalesWeek[] = data.map((r) => ({
      weekStart: r.week_start,
      weekEnd: r.week_end,
      delivery: { supply: r.delivery_supply, vat: r.delivery_vat, total: r.delivery_total },
      riderFee: { supply: r.rider_fee_supply, vat: r.rider_fee_vat, total: r.rider_fee_total },
      mgmt: { supply: r.mgmt_supply, vat: r.mgmt_vat, total: r.mgmt_total },
      payback: { supply: r.payback_supply, vat: r.payback_vat, total: r.payback_total },
      sum: { supply: r.sum_supply, vat: r.sum_vat, total: r.sum_total },
    }));
    return { weeks };
  } catch {
    return { weeks: [] };
  }
}
