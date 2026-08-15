import { loadRiderNotes, loadRiderMemos, loadRiderRrns, loadSettlementRiders } from "@/app/settlement/_lib/notes";
import { loadTerminatedRiderIds } from "@/app/settlement/_lib/contract";
import { isRidersUnlocked } from "@/lib/auth/settlement-cookies";
import { RiderSettings } from "@/components/settlement/rider-settings";
import { RidersUnlockForm } from "@/components/settlement/riders-unlock-form";

export const dynamic = "force-dynamic";

// 라이더 설정 — 라이더별 메모·특이사항·주민등록번호 입력/저장(정산 화면 전반 공유).
// 주민번호 등 민감정보 포함 → 정산 세션 위 2차 비밀번호 잠금(최고관리자 전용).
export default async function RiderSettingsPage() {
  if (!(await isRidersUnlocked())) {
    return <RidersUnlockForm />;
  }
  const [riders, notes, memos, rrns, terminated] = await Promise.all([
    loadSettlementRiders(),
    loadRiderNotes(),
    loadRiderMemos(),
    loadRiderRrns(),
    loadTerminatedRiderIds(),
  ]);
  return <RiderSettings riders={riders} notes={notes} memos={memos} rrns={rrns} terminated={terminated} />;
}
