"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { SettlementRider } from "@/app/settlement/_lib/notes";
import { lockRiderSettings } from "@/actions/settlement-riders-auth";
import { RiderNotes } from "./rider-notes";
import { useRiderNotesApi } from "./notes-api";

// 라이더 설정 — 라이더별 메모·특이사항·주민등록번호를 한 곳에서 입력/저장.
// 저장 데이터는 정산 화면 전반(일일정산·본사미션 등)과 동일 맵을 공유 → 어디서든 반영.
export function RiderSettings({
  riders,
  notes,
  memos,
  rrns,
  terminated,
}: {
  riders: SettlementRider[];
  notes: Record<string, string>;
  memos: Record<string, string>;
  rrns: Record<string, string>;
  terminated?: string[];
}) {
  const api = useRiderNotesApi(notes, memos, rrns);
  const router = useRouter();
  const [locking, startLock] = useTransition();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">라이더 설정</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            라이더별 메모·특이사항·주민등록번호를 입력해 두면 정산 화면 전반에 같은 데이터로 반영됩니다. 주민등록번호는 암호화되어 저장됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startLock(async () => { await lockRiderSettings(); router.refresh(); })}
          disabled={locking}
          className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-card px-3 py-2 text-[12.5px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-50"
        >
          <Lock size={14} />
          {locking ? "잠그는 중…" : "잠금"}
        </button>
      </div>

      <RiderNotes
        api={api}
        riders={riders}
        terminated={terminated}
        heading="라이더별 정보"
        subtitle="메모·특이사항·주민등록번호 · 라이더에 귀속돼 유지"
      />
    </div>
  );
}
