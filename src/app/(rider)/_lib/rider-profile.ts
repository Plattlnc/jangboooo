// 로그인 라이더 프로필 — 서버 전용. 세션의 admin_rider_id 로 riders 테이블 조회.
// 드로어/내정보가 공유(같은 로그인 정보로 통일). React cache 로 요청당 1회만 조회.
// 폴백: DEMO_MODE 또는 Supabase env/세션 미설정 → 데모 프로필.

import { cache } from "react";
import { DEMO_MODE } from "@/lib/demo";

export interface RiderProfile {
  name: string;
  /** 아바타 이니셜(이름 첫 글자) */
  initial: string;
  /** admin_rider_id */
  uid: string;
  phone: string | null;
  region: string | null;
  centerId: string | null;
  isActive: boolean;
  /** 가입일 ISO (riders.created_at) */
  createdAt: string | null;
  /** 등록 차량번호 (riders.plate) — ROADING 임베드 '내차량' 표기용. 컬럼/값 없으면 null. */
  plate: string | null;
  /** 실 사용자 이름 (내정보 등록, 0012) — ROADING 프리필 시 name 보다 우선. */
  realName: string | null;
  /** 실 사용자 연락처 (내정보 등록, 0012) — ROADING 프리필 시 phone 보다 우선. */
  realPhone: string | null;
  /** 운행 바이크 기종 (내정보 등록, 0012) — ROADING 내차량 카드 표기. */
  bikeModel: string | null;
  /** 차량 이용 형태 (내정보 등록, 0013): '렌탈' | '리스'. */
  usageType: string | null;
  /** 보험 시작일 'YYYY-MM-DD' (내정보 등록, 0013). */
  insuranceStart: string | null;
  /** 보험 기간 일수 (내정보 등록, 0013). */
  insuranceDays: number | null;
  /** 프로필 사진 공개 URL (riders.avatar_path, 0015). 미등록/컬럼 미존재 시 null → 이니셜 표시. */
  avatarUrl: string | null;
}

function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// 데모/미연결 시 표시용. 실연결 시엔 riders 행으로 대체.
const DEMO_PROFILE: RiderProfile = {
  name: "라이더",
  initial: "라",
  uid: "MOCK-0000",
  phone: "010-8504-2666",
  region: "서울 강남구",
  centerId: "생각대로 역삼센터",
  isActive: true,
  createdAt: "2024-03-18",
  plate: "12가3456",
  realName: null,
  realPhone: null,
  bikeModel: null,
  usageType: null,
  insuranceStart: null,
  insuranceDays: null,
  avatarUrl: null,
};

function initialOf(name: string): string {
  return name.trim().slice(0, 1) || "라";
}

export const getRiderProfile = cache(async (): Promise<RiderProfile> => {
  if (DEMO_MODE || !hasSupabaseEnv()) return DEMO_PROFILE;

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return DEMO_PROFILE;

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data } = await admin
      .from("riders")
      .select("name, phone, region, center_id, is_active, created_at, admin_rider_id")
      .eq("admin_rider_id", session.adminRiderId)
      .maybeSingle();

    // 내정보 등록 필드(0008/0012)는 별도 best-effort 조회(컬럼 미존재해도 본 프로필은 안 깨지게 분리).
    let plate: string | null = null;
    let realName: string | null = null;
    let realPhone: string | null = null;
    let bikeModel: string | null = null;
    let usageType: string | null = null;
    let insuranceStart: string | null = null;
    let insuranceDays: number | null = null;
    let avatarUrl: string | null = null;
    try {
      const { data: pv } = await admin
        .from("riders")
        .select("plate, real_name, real_phone, bike_model, usage_type, insurance_start, insurance_days, avatar_path")
        .eq("admin_rider_id", session.adminRiderId)
        .maybeSingle();
      plate = pv?.plate ?? null;
      realName = pv?.real_name ?? null;
      realPhone = pv?.real_phone ?? null;
      bikeModel = pv?.bike_model ?? null;
      usageType = pv?.usage_type ?? null;
      insuranceStart = pv?.insurance_start ?? null;
      insuranceDays = pv?.insurance_days ?? null;
      if (pv?.avatar_path) {
        avatarUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${pv.avatar_path}`;
      }
    } catch {
      /* 컬럼 미존재 등 — 무시 */
    }

    const name = data?.name ?? "라이더";
    return {
      name,
      initial: initialOf(name),
      uid: data?.admin_rider_id ?? session.adminRiderId,
      phone: data?.phone ?? null,
      region: data?.region ?? null,
      centerId: data?.center_id ?? null,
      isActive: data?.is_active ?? false,
      createdAt: data?.created_at ?? null,
      plate,
      realName,
      realPhone,
      bikeModel,
      usageType,
      insuranceStart,
      insuranceDays,
      avatarUrl,
    };
  } catch {
    // 조회 실패 시에도 최소한 로그인 식별자는 보여줌(나머지 '-').
    return {
      name: "라이더",
      initial: "라",
      uid: session.adminRiderId,
      phone: null,
      region: null,
      centerId: null,
      isActive: false,
      createdAt: null,
      plate: null,
      realName: null,
      realPhone: null,
      bikeModel: null,
      usageType: null,
      insuranceStart: null,
      insuranceDays: null,
      avatarUrl: null,
    };
  }
});
