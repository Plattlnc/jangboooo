import { fetchRiderList } from "@/app/settlement/_lib/riders-admin";
import { RiderDirectoryView } from "@/components/settlement/rider-directory-view";

export const dynamic = "force-dynamic";

// 라이더 관리 — 전 라이더 명단(계약상태·활동요약) + 행 클릭 시 상세. grider 계약상태 + 배민 활동 종합.
export default async function RiderAdminPage() {
  const riders = await fetchRiderList();
  return <RiderDirectoryView riders={riders} />;
}
