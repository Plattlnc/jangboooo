import { fetchRiderList } from "@/app/settlement/_lib/riders-admin";
import { RiderDirectoryView } from "@/components/settlement/rider-directory-view";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 라이더 정보 — 전 라이더 명단(계약상태·활동요약) + 행 클릭 시 상세. grider 계약상태 + 배민 활동 종합.
export default async function RiderAdminPage() {
  const riders = await fetchRiderList();
  return (
    <div>
      <div className="mb-4">
        <DataPulse source="contract" label="라이더 정보(계약상태)" cadence="매일 자동 스크래핑 (grider 라이더 조회)" />
      </div>
      <RiderDirectoryView riders={riders} />
    </div>
  );
}
