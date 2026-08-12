"use client";

import { useState, type ReactNode } from "react";
import { ListChecks, StickyNote } from "lucide-react";
import type { DailySettlement } from "@/app/settlement/_lib/daily";
import type { SettlementRider } from "@/app/settlement/_lib/notes";
import { DailySettlementView } from "./daily-view";
import { RiderNotes } from "./rider-notes";
import { useRiderNotesApi } from "./notes-api";

// 일일 정산 화면 탭 — [정산 내역](특이사항 컬럼 포함) / [기타](라이더별 특이사항 목록).
// 두 탭이 동일한 특이사항 상태(useRiderNotesApi)를 공유 → 어디서 수정하든 함께 저장.
export function DailyTabs({
  data,
  today,
  riders,
  notes,
}: {
  data: DailySettlement;
  today: string;
  riders: SettlementRider[];
  notes: Record<string, string>;
}) {
  const [tab, setTab] = useState<"settle" | "notes">("settle");
  const notesApi = useRiderNotesApi(notes);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">일일 정산</h1>
        <div className="mt-3 flex items-center gap-1 border-b border-jb-line">
          <TabButton active={tab === "settle"} onClick={() => setTab("settle")} icon={<ListChecks size={15} />} label="정산 내역" />
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")} icon={<StickyNote size={15} />} label="기타" />
        </div>
      </div>

      {tab === "settle" ? (
        <DailySettlementView data={data} today={today} notesApi={notesApi} />
      ) : (
        <RiderNotes api={notesApi} riders={riders} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={
        "-mb-px flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[14px] transition-colors " +
        (active
          ? "border-jb-indigo font-semibold text-jb-indigo"
          : "border-transparent font-medium text-jb-ink-mute hover:text-jb-ink-soft")
      }
    >
      {icon}
      {label}
    </button>
  );
}
