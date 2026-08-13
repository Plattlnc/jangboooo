"use client";

import type { SettlementRider } from "@/app/settlement/_lib/notes";
import { RiderNotes } from "./rider-notes";
import { useRiderNotesApi } from "./notes-api";

// 라이더 설정 — 라이더별 메모·특이사항·주민등록번호를 한 곳에서 입력/저장.
// 저장 데이터는 정산 화면 전반(일일정산·본사미션 등)과 동일 맵을 공유 → 어디서든 반영.
export function RiderSettings({
  riders,
  notes,
  memos,
  rrns,
}: {
  riders: SettlementRider[];
  notes: Record<string, string>;
  memos: Record<string, string>;
  rrns: Record<string, string>;
}) {
  const api = useRiderNotesApi(notes, memos, rrns);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">라이더 설정</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">
          라이더별 메모·특이사항·주민등록번호를 입력해 두면 정산 화면 전반에 같은 데이터로 반영됩니다. 주민등록번호는 암호화되어 저장됩니다.
        </p>
      </div>

      <RiderNotes
        api={api}
        riders={riders}
        heading="라이더별 정보"
        subtitle="메모·특이사항·주민등록번호 · 라이더에 귀속돼 유지"
      />
    </div>
  );
}
