// 배달일지 데이터 접근 — 서버 전용. 세션 라이더의 월별 일일 완료 기록.
// RPC get_rider_daily_for(p_period='month', p_ref=월 중순) 재사용 — 영업일(-6h 앵커) 경계 동일.
// 폴백: DEMO_MODE / env·세션 미설정 → 결정적 목 데이터.

import type { RiderDailyRow } from "@/types/database";
import { DEMO_MODE } from "@/lib/demo";

export interface DiaryDay {
  /** YYYY-MM-DD (영업일) */
  date: string;
  /** 요일 한 글자 (월~일) */
  weekday: string;
  completed: number;
  rejected: number;
  /** 배차취소 + 배달취소 합 */
  canceled: number;
  /** 0~100 또는 null */
  acceptanceRate: number | null;
  /** 배달처리비(세전 수입, 원). 적재 데이터 없으면 null. */
  feeKrw: number | null;
  /** 본사 미션 금액(원). 없으면 0. */
  missionKrw: number;
  /** 총 이동거리(km, 소수1). 상세 없으면 null. */
  distanceKm: number | null;
  /** 시급(원/시간) = 수입 / (첫픽업~마지막전달). 근무시간 있을 때만. */
  hourlyKrw: number | null;
}

export interface DiaryMonth {
  /** YYYY-MM */
  month: string;
  days: DiaryDay[]; // 최신일 우선
  totalCompleted: number;
  activeDays: number;
  /** 이 달 배달처리비 합(세전, 원). 적재 데이터 없으면 null. */
  totalFeeKrw: number | null;
  /** 이 달 본사 미션 합(원). */
  totalMissionKrw: number;
  /** 이 달 총 이동거리(km, 소수1). 상세 없으면 null. */
  totalDistanceKm: number | null;
  /** 이 달 시급(원/시간) = 총수입 / 총근무시간. */
  hourlyKrw: number | null;
}

/** 일자별 배달처리비/미션 (rider_daily_fees 적재분). */
type FeeMap = Map<string, { fee: number; mission: number }>;
/** 일자별 이동거리(m)·근무시간(분) — delivery_fee_details 집계. */
type MetricMap = Map<string, { distanceM: number; workMin: number | null }>;

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

function weekdayOf(date: string): string {
  // 정오 UTC 앵커 — 서버 TZ 와 무관하게 해당 달력일의 요일을 얻는다.
  return WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** 수입/근무(분) → 시급(원/시간). 근무 0이면 null. */
function hourly(fee: number | null, workMin: number | null): number | null {
  if (fee == null || workMin == null || workMin <= 0) return null;
  return Math.round(fee / (workMin / 60));
}

function toDiary(month: string, rows: RiderDailyRow[], fees?: FeeMap, metrics?: MetricMap): DiaryMonth {
  const days = rows
    .filter((r) => r.completed > 0 || r.rejected > 0 || r.assigned > 0) // 무활동 빈 행 제외
    .map((r) => {
      const f = fees?.get(r.snapshot_date);
      const met = metrics?.get(r.snapshot_date);
      const fee = f ? f.fee : null;
      const distanceM = met?.distanceM ?? 0;
      return {
        date: r.snapshot_date,
        weekday: weekdayOf(r.snapshot_date),
        completed: r.completed,
        rejected: r.rejected,
        canceled: r.dispatch_canceled + r.delivery_canceled,
        acceptanceRate: r.acceptance_rate,
        feeKrw: fee,
        missionKrw: f ? f.mission : 0,
        distanceKm: distanceM > 0 ? Math.floor(distanceM / 100) / 10 : null,
        hourlyKrw: hourly(fee, met?.workMin ?? null),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const hasFees = days.some((d) => d.feeKrw != null);
  const totalFee = hasFees ? days.reduce((sum, d) => sum + (d.feeKrw ?? 0), 0) : null;
  const totalDistM = days.reduce((sum, d) => sum + (metrics?.get(d.date)?.distanceM ?? 0), 0);
  const totalWorkMin = days.reduce((sum, d) => sum + (metrics?.get(d.date)?.workMin ?? 0), 0);
  return {
    month,
    days,
    totalCompleted: days.reduce((sum, d) => sum + d.completed, 0),
    activeDays: days.length,
    totalFeeKrw: totalFee,
    totalMissionKrw: days.reduce((sum, d) => sum + d.missionKrw, 0),
    totalDistanceKm: totalDistM > 0 ? Math.floor(totalDistM / 100) / 10 : null,
    hourlyKrw: hourly(totalFee, totalWorkMin > 0 ? totalWorkMin : null),
  };
}

// 데모용 결정적 목 — 요청 월의 1~26일 중 주 5~6일 활동.
function demoDiary(month: string): DiaryMonth {
  const rows: RiderDailyRow[] = [];
  const fees: FeeMap = new Map();
  const metrics: MetricMap = new Map();
  for (let d = 1; d <= 26; d++) {
    if (d % 7 === 3) continue; // 주 1일 휴무
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const completed = 24 + ((d * 7) % 23);
    rows.push({
      snapshot_date: date,
      sla_score: null,
      completed,
      rejected: (d * 3) % 5,
      dispatch_canceled: d % 3 === 0 ? 1 : 0,
      delivery_canceled: 0,
      assigned: completed + 5,
      acceptance_rate: 80 + ((d * 11) % 15),
    });
    // 데모 수입: 완료 1건당 대략 4,300~5,000원 + 가끔 미션.
    fees.set(date, { fee: completed * (4300 + ((d * 37) % 700)), mission: d % 6 === 0 ? 15000 : 0 });
    // 데모 지표: 1건당 ~1.6km 이동, ~11분/건 근무.
    metrics.set(date, { distanceM: completed * (1400 + ((d * 53) % 500)), workMin: completed * 11 + 30 });
  }
  return toDiary(month, rows, fees, metrics);
}

// ── 일자별 배달건 상세 (배달일지 카드 터치 시) ──
export interface DeliveryDetail {
  deliveryNo: string;
  status: string; // 배달상태(전달완료/배달취소 등)
  isCanceled: boolean;
  pickupTime: string | null; // HH:MM
  deliveredTime: string | null; // HH:MM
  distanceKm: number | null; // floor(m/100)/10 (예 2492→2.4)
  feeKrw: number; // 배달처리비(세전)
  base: number; // 기본단가
  weather: number; // 기상할증
  extra: number; // 추가할증
  peak: number; // 피크할증 등
  region: number; // 지역 할증
  bulk: number; // 대량 할증
}

export interface DayDetail {
  date: string;
  deliveries: DeliveryDetail[]; // 시간순(빠른→늦은)
  totalFeeKrw: number;
  completedCount: number;
  canceledCount: number;
}

/** ISO local('...T20:54:14') → 'HH:MM'. */
function hhmm(iso: string | null): string | null {
  if (!iso) return null;
  const m = /T(\d{2}:\d{2})/.exec(iso);
  return m ? m[1] : null;
}

export async function getDayDeliveryDetails(date: string): Promise<DayDetail | null> {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return demoDayDetail(date);

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return demoDayDetail(date);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("delivery_fee_details")
      .select("delivery_no, status, pickup_at, delivered_at, distance_m, base_fee, weather_fee, extra_fee, peak_fee, region_fee, bulk_fee, fee_krw")
      .eq("admin_rider_id", session.adminRiderId)
      .eq("snapshot_date", date);
    if (error) {
      console.error("[diary] delivery_fee_details 조회 실패:", error.code, error.message);
      return { date, deliveries: [], totalFeeKrw: 0, completedCount: 0, canceledCount: 0 };
    }
    const deliveries: DeliveryDetail[] = (data ?? [])
      .map((r) => {
        const status = String(r.status ?? "");
        return {
          deliveryNo: r.delivery_no as string,
          status,
          isCanceled: status !== "전달완료",
          pickupTime: hhmm(r.pickup_at as string | null),
          deliveredTime: hhmm(r.delivered_at as string | null),
          distanceKm: r.distance_m != null ? Math.floor((r.distance_m as number) / 100) / 10 : null,
          feeKrw: (r.fee_krw as number) ?? 0,
          base: (r.base_fee as number) ?? 0,
          weather: (r.weather_fee as number) ?? 0,
          extra: (r.extra_fee as number) ?? 0,
          peak: (r.peak_fee as number) ?? 0,
          region: (r.region_fee as number) ?? 0,
          bulk: (r.bulk_fee as number) ?? 0,
        };
      })
      // 시간순: 전달완료 시각 우선, 없으면 픽업, 그마저 없으면 뒤로.
      .sort((a, b) => (a.deliveredTime ?? a.pickupTime ?? "99:99").localeCompare(b.deliveredTime ?? b.pickupTime ?? "99:99"));
    return {
      date,
      deliveries,
      totalFeeKrw: deliveries.reduce((s, d) => s + d.feeKrw, 0),
      completedCount: deliveries.filter((d) => !d.isCanceled).length,
      canceledCount: deliveries.filter((d) => d.isCanceled).length,
    };
  } catch (e) {
    console.error("[diary] 상세 예외:", e);
    return { date, deliveries: [], totalFeeKrw: 0, completedCount: 0, canceledCount: 0 };
  }
}

function demoDayDetail(date: string): DayDetail {
  const deliveries: DeliveryDetail[] = [];
  const n = 8 + (Number(date.slice(8, 10)) % 6);
  for (let i = 0; i < n; i++) {
    const canceled = i === 2;
    const base = 2400 + ((i * 130) % 900);
    const peak = i % 2 === 0 ? 1000 : 0;
    const weather = i % 5 === 0 ? 500 : 0;
    const fee = canceled ? 0 : base + peak + weather;
    const hh = String(11 + i).padStart(2, "0");
    deliveries.push({
      deliveryNo: `DEMO${date.replaceAll("-", "")}${i}`,
      status: canceled ? "배달취소" : "전달완료",
      isCanceled: canceled,
      pickupTime: `${hh}:${String((i * 7) % 60).padStart(2, "0")}`,
      deliveredTime: canceled ? null : `${hh}:${String((i * 7 + 15) % 60).padStart(2, "0")}`,
      distanceKm: Math.floor((900 + i * 240) / 100) / 10,
      feeKrw: fee,
      base: canceled ? 0 : base,
      weather: canceled ? 0 : weather,
      extra: 0,
      peak: canceled ? 0 : peak,
      region: 0,
      bulk: 0,
    });
  }
  return {
    date,
    deliveries,
    totalFeeKrw: deliveries.reduce((s, d) => s + d.feeKrw, 0),
    completedCount: deliveries.filter((d) => !d.isCanceled).length,
    canceledCount: deliveries.filter((d) => d.isCanceled).length,
  };
}

export async function getDeliveryDiary(month: string): Promise<DiaryMonth> {
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return demoDiary(month);

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return demoDiary(month);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    // sla_period_range('month', ref) = 월초 ~ ref일(month-to-date) — 전체 월을 얻으려면
    // ref 를 그 달의 말일로 준다(미래 일자는 행이 없어 무해, 진행 중인 오늘 행은 포함됨).
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const { data, error } = await admin.rpc("get_rider_daily_for", {
      p_admin_rider_id: session.adminRiderId,
      p_period: "month",
      p_ref: `${month}-${String(lastDay).padStart(2, "0")}`,
    });
    if (error) {
      console.error("[diary] get_rider_daily_for RPC 실패:", error.code, error.message);
      return toDiary(month, []);
    }
    // 배달처리비(세전 수입) 병합 — rider_daily_fees(엑셀 적재분). 테이블/데이터 없으면 수입 미표시로 폴백.
    const fees: FeeMap = new Map();
    const { data: feeRows, error: feeErr } = await admin
      .from("rider_daily_fees")
      .select("snapshot_date, fee_krw, mission_krw")
      .eq("admin_rider_id", session.adminRiderId)
      .gte("snapshot_date", `${month}-01`)
      .lte("snapshot_date", `${month}-${String(lastDay).padStart(2, "0")}`);
    if (feeErr) {
      console.error("[diary] rider_daily_fees 조회 실패(수입 미표시):", feeErr.code, feeErr.message);
    } else {
      for (const r of feeRows ?? []) {
        fees.set(r.snapshot_date as string, {
          fee: (r.fee_krw as number) ?? 0,
          mission: (r.mission_krw as number) ?? 0,
        });
      }
    }
    // 총 이동거리·시급용 — delivery_fee_details 에서 일자별 총이동거리(전달완료)·근무시간(첫픽업~마지막전달) 집계.
    const metrics: MetricMap = new Map();
    const { data: detRows, error: detErr } = await admin
      .from("delivery_fee_details")
      .select("snapshot_date, status, distance_m, pickup_at, delivered_at")
      .eq("admin_rider_id", session.adminRiderId)
      .gte("snapshot_date", `${month}-01`)
      .lte("snapshot_date", `${month}-${String(lastDay).padStart(2, "0")}`);
    if (detErr) {
      console.error("[diary] delivery_fee_details 집계 실패(지표 미표시):", detErr.code, detErr.message);
    } else {
      const agg = new Map<string, { distanceM: number; firstPickup: string | null; lastDeliver: string | null }>();
      for (const r of detRows ?? []) {
        const date = r.snapshot_date as string;
        const a = agg.get(date) ?? { distanceM: 0, firstPickup: null, lastDeliver: null };
        if (r.status === "전달완료" && r.distance_m != null) a.distanceM += r.distance_m as number;
        const pu = r.pickup_at as string | null;
        const dl = r.delivered_at as string | null;
        if (pu && (a.firstPickup == null || pu < a.firstPickup)) a.firstPickup = pu;
        if (dl && (a.lastDeliver == null || dl > a.lastDeliver)) a.lastDeliver = dl;
        agg.set(date, a);
      }
      for (const [date, a] of agg) {
        let workMin: number | null = null;
        if (a.firstPickup && a.lastDeliver) {
          const ms = new Date(a.lastDeliver).getTime() - new Date(a.firstPickup).getTime();
          if (ms > 0) workMin = Math.round(ms / 60000);
        }
        metrics.set(date, { distanceM: a.distanceM, workMin });
      }
    }
    return toDiary(month, data ?? [], fees.size ? fees : undefined, metrics.size ? metrics : undefined);
  } catch (e) {
    console.error("[diary] 예기치 못한 예외:", e);
    return toDiary(month, []);
  }
}
