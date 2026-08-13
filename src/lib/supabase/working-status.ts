import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 스크래퍼가 1분 주기로 Storage(ops/working-status.json)에 적재하는 실시간 근무 인원 스냅샷.
// 별도 테이블/마이그레이션 없이 관리자 홈 히어로의 "현재 출근 인원"에 사용.
const OPS_BUCKET = "ops";
const WORKING_STATUS_PATH = "working-status.json";

export type WorkingRider = { id: string; name: string | null; status: string | null; completed: number };

export type WorkingStatus = {
  working: number; // 운행 종료(READY)가 아닌 라이더 수 = 현재 출근 인원
  total: number; // status 판별 가능한 라이더 수
  snapshotDate: string | null;
  capturedAt: string | null;
  byStatus: Record<string, number>;
  riders: WorkingRider[]; // 현재 근무중 라이더 목록
};

export async function getWorkingStatus(): Promise<WorkingStatus | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(OPS_BUCKET).download(WORKING_STATUS_PATH);
    if (error || !data) return null;
    const json = JSON.parse(await data.text()) as Record<string, unknown>;
    const rawRiders = Array.isArray(json.riders) ? (json.riders as Record<string, unknown>[]) : [];
    const riders: WorkingRider[] = rawRiders
      .filter((r) => typeof r.admin_rider_id === "string")
      .map((r) => ({
        id: r.admin_rider_id as string,
        name: typeof r.name === "string" ? r.name : null,
        status: typeof r.status === "string" ? r.status : null,
        completed: Number(r.completed ?? 0),
      }));
    return {
      working: Number(json.working ?? 0),
      total: Number(json.total ?? 0),
      snapshotDate: typeof json.snapshot_date === "string" ? json.snapshot_date : null,
      capturedAt: typeof json.captured_at === "string" ? json.captured_at : null,
      byStatus: (json.by_status as Record<string, number>) ?? {},
      riders,
    };
  } catch {
    return null;
  }
}
