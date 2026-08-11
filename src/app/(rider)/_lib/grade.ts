// 배달등급 데이터 — 세션 라이더의 이번 주(수~화) 누적 완료건 → 현재 등급 + 누진 보상.
// 완료건 = get_rider_summary_for('week').completed(전체 완료, 히어로 배달건과 동일 기준).
// 라이더 키 = admin_rider_id(=User ID). 폴백: 데모/미설정/세션없음.

import { computeGrade, type GradeResult } from "@/lib/grade";
import { DEMO_MODE } from "@/lib/demo";
import { getRiderProfile } from "./rider-profile";

export interface MyGrade extends GradeResult {
  name: string;
  weekStart: string | null; // 이번 주 시작(수)
  weekEnd: string | null; // 이번 주 끝(화)
}

function wrap(name: string, completed: number, weekStart: string | null, weekEnd: string | null): MyGrade {
  return { name, weekStart, weekEnd, ...computeGrade(completed) };
}

export async function getMyGrade(): Promise<MyGrade> {
  const profile = await getRiderProfile(); // 이름(데모 안전)
  const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (DEMO_MODE || !hasEnv) return wrap(profile.name, 223, null, null); // 데모: 다이아 예시

  const { getRiderSession } = await import("@/lib/auth/cookies");
  const session = await getRiderSession();
  if (!session) return wrap(profile.name, 0, null, null);

  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_rider_summary_for", {
      p_admin_rider_id: session.adminRiderId,
      p_period: "week",
    });
    if (error) {
      console.error("[grade] get_rider_summary_for 실패:", error.code, error.message);
      return wrap(profile.name, 0, null, null);
    }
    const row = data?.[0];
    return wrap(profile.name, row?.completed ?? 0, row?.start_date ?? null, row?.end_date ?? null);
  } catch (e) {
    console.error("[grade] 예외:", e);
    return wrap(profile.name, 0, null, null);
  }
}
