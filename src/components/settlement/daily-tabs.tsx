"use client";

import { useState, type ReactNode } from "react";
import { ListChecks, StickyNote } from "lucide-react";
import type { DailySettlement } from "@/app/settlement/_lib/daily";
import { DailySettlementView } from "./daily-view";
import { SettlementMemo } from "./settlement-memo";

// 일일 정산 화면 탭 — [정산 내역] 테이블 / [기타] 메모(저장 가능).
export function DailyTabs({ data, today, memo }: { data: DailySettlement; today: string; memo: string }) {
  const [tab, setTab] = useState<"settle" | "memo">("settle");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">일일 정산</h1>
        <div className="mt-3 flex items-center gap-1 border-b border-jb-line">
          <TabButton active={tab === "settle"} onClick={() => setTab("settle")} icon={<ListChecks size={15} />} label="정산 내역" />
          <TabButton active={tab === "memo"} onClick={() => setTab("memo")} icon={<StickyNote size={15} />} label="기타" />
        </div>
      </div>

      {tab === "settle" ? <DailySettlementView data={data} today={today} /> : <SettlementMemo initial={memo} />}
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
