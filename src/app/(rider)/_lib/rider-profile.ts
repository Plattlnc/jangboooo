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
    };
  }
});
