import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 라이더 관리(디렉터리) — 전 라이더 목록 + 상세. grider 계약상태 + 배민 활동/등록정보/정산 종합.

export interface RiderListItem {
  riderId: string;
  name: string;
  phone: string | null;
  region: string | null;
  centerId: string | null;
  createdAt: string;
  isActive: boolean;
  contractStatus: string | null; // 계약중 | 계약종료 | null(미수집)
  isTerminated: boolean;
  lastActive: string | null; // 배민 마지막 활동일
  activeDays: number;
  totalCompleted: number;
}

export async function fetchRiderList(): Promise<RiderListItem[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_rider_directory");
    if (error || !data) return [];
    return data.map((r) => ({
      riderId: r.admin_rider_id,
      name: r.name ?? r.admin_rider_id,
      phone: r.phone,
      region: r.region,
      centerId: r.center_id,
      createdAt: r.created_at,
      isActive: r.is_active,
      contractStatus: r.contract_status,
      isTerminated: r.is_terminated,
      lastActive: r.last_active,
      activeDays: Number(r.active_days ?? 0),
      totalCompleted: Number(r.total_completed ?? 0),
    }));
  } catch {
    return [];
  }
}

export interface RiderDetail {
  riderId: string;
  name: string;
  // 프로필
  phone: string | null;
  region: string | null;
  centerId: string | null;
  createdAt: string | null;
  isActive: boolean;
  // 계약
  contractStatus: string | null;
  isTerminated: boolean;
  contractCapturedAt: string | null;
  // 내정보 등록
  realName: string | null;
  realPhone: string | null;
  plate: string | null;
  bikeModel: string | null;
  usageType: string | null;
  insuranceStart: string | null;
  insuranceDays: number | null;
  // 배민 활동
  lastActive: string | null;
  activeDays: number;
  totalCompleted: number;
  recentCompleted: { date: string; completed: number; acceptanceRate: number | null }[]; // 최근 14일
  // 정산(최근)
  recentFees: { date: string; feeKrw: number; missionKrw: number }[]; // 최근 14일
  latestInsuranceWeek: string | null;
  latestInsuranceKrw: number | null;
}

export async function fetchRiderDetail(riderId: string): Promise<RiderDetail | null> {
  try {
    const supabase = createAdminClient();
    const [profileRes, contractRes, slaRes, feeRes, insRes] = await Promise.all([
      supabase
        .from("riders")
        .select(
          "admin_rider_id, name, phone, region, center_id, is_active, created_at, plate, real_name, real_phone, bike_model, usage_type, insurance_start, insurance_days",
        )
        .eq("admin_rider_id", riderId)
        .maybeSingle(),
      supabase
        .from("rider_contract_status")
        .select("status, is_terminated, captured_at")
        .eq("admin_rider_id", riderId)
        .maybeSingle(),
      supabase
        .from("sla_snapshots")
        .select("snapshot_date, completed, acceptance_rate")
        .eq("admin_rider_id", riderId)
        .order("snapshot_date", { ascending: false })
        .limit(14),
      supabase
        .from("rider_daily_fees")
        .select("snapshot_date, fee_krw, mission_krw")
        .eq("admin_rider_id", riderId)
        .order("snapshot_date", { ascending: false })
        .limit(14),
      supabase
        .from("rider_weekly_insurance")
        .select("week_start, week_end, amount_krw")
        .eq("admin_rider_id", riderId)
        .order("week_start", { ascending: false })
        .limit(1),
    ]);

    const p = profileRes.data;
    if (!p) return null;
    const c = contractRes.data;
    const ins = insRes.data?.[0];

    // 활동 요약(전체) — 별도 count/sum 은 목록 RPC 값 재사용이 이상적이나 상세는 최근치로 충분.
    let totalCompleted = 0;
    let activeDays = 0;
    let lastActive: string | null = null;
    {
      const { data: agg } = await supabase
        .from("sla_snapshots")
        .select("snapshot_date, completed")
        .eq("admin_rider_id", riderId)
        .order("snapshot_date", { ascending: false })
        .limit(1000);
      if (agg) {
        activeDays = agg.length;
        lastActive = agg[0]?.snapshot_date ?? null;
        totalCompleted = agg.reduce((s, r) => s + (r.completed ?? 0), 0);
      }
    }

    return {
      riderId: p.admin_rider_id,
      name: p.name ?? p.admin_rider_id,
      phone: p.phone,
      region: p.region,
      centerId: p.center_id,
      createdAt: p.created_at,
      isActive: p.is_active,
      contractStatus: c?.status ?? null,
      isTerminated: Boolean(c?.is_terminated),
      contractCapturedAt: c?.captured_at ?? null,
      realName: p.real_name ?? null,
      realPhone: p.real_phone ?? null,
      plate: p.plate ?? null,
      bikeModel: p.bike_model ?? null,
      usageType: p.usage_type ?? null,
      insuranceStart: p.insurance_start ?? null,
      insuranceDays: p.insurance_days ?? null,
      lastActive,
      activeDays,
      totalCompleted,
      recentCompleted: (slaRes.data ?? []).map((r) => ({
        date: r.snapshot_date,
        completed: r.completed ?? 0,
        acceptanceRate: r.acceptance_rate,
      })),
      recentFees: (feeRes.data ?? []).map((r) => ({
        date: r.snapshot_date,
        feeKrw: r.fee_krw ?? 0,
        missionKrw: r.mission_krw ?? 0,
      })),
      latestInsuranceWeek: ins ? `${ins.week_start} ~ ${ins.week_end}` : null,
      latestInsuranceKrw: ins?.amount_krw ?? null,
    };
  } catch {
    return null;
  }
}
