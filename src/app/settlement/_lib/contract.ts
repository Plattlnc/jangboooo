import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 계약종료(탈퇴) 라이더 ID 목록 — grider 라이더 관리 계약상태(rider_contract_status, 0026) 적재분.
// 정산 화면에서 '계약종료' 뱃지 표기용. 클라이언트로 넘기기 위해 배열 반환(Set 직렬화 불가).
export async function loadTerminatedRiderIds(): Promise<string[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("rider_contract_status")
      .select("admin_rider_id")
      .eq("is_terminated", true)
      .limit(2000);
    if (error || !data) return [];
    return data.map((r) => r.admin_rider_id);
  } catch {
    return [];
  }
}
