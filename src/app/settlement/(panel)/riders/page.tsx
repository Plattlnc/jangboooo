import { loadRiderNotes, loadRiderMemos, loadRiderRrns, loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { RiderSettings } from "@/components/settlement/rider-settings";

export const dynamic = "force-dynamic";

// 라이더 설정 — 라이더별 메모·특이사항·주민등록번호 입력/저장(정산 화면 전반 공유).
export default async function RiderSettingsPage() {
  const [riders, notes, memos, rrns] = await Promise.all([
    loadSettlementRiders(),
    loadRiderNotes(),
    loadRiderMemos(),
    loadRiderRrns(),
  ]);
  return <RiderSettings riders={riders} notes={notes} memos={memos} rrns={rrns} />;
}
