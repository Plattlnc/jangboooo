import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 라이더 계약종료(탈퇴) 여부 — grider 라이더 관리 계약상태(rider_contract_status, 0026).
// best-effort: 조회 실패/테이블 부재 시 false(정상 라이더를 막지 않도록 fail-open).
export async function isRiderTerminated(adminRiderId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("rider_contract_status")
      .select("is_terminated")
      .eq("admin_rider_id", adminRiderId)
      .maybeSingle();
    if (error || !data) return false;
    return Boolean(data.is_terminated);
  } catch {
    return false;
  }
}

/** 계약종료 라이더 안내 문구(로그인 차단·세션 차단 공통). */
export const CONTRACT_TERMINATED_MESSAGE = "계약종료 라이더님은 별도 문의 주세요.";
