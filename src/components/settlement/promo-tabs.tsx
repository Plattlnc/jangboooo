"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import type { PromoSettlement } from "@/app/settlement/_lib/promo";
import { PromoSettlementView } from "./promo-view";
import { SettlementHeader } from "./settlement-header";
import { useRiderNotesApi } from "./notes-api";

// 자사 프로모션 — 주간(수~화) 정산 테이블(메모·특이사항 인라인, 라이더 설정과 공유 데이터).
export function PromoTabs({
  data,
  today,
  notes,
  memos,
  terminated,
}: {
  data: PromoSettlement;
  today: string;
  notes: Record<string, string>;
  memos: Record<string, string>;
  terminated?: string[];
}) {
  const notesApi = useRiderNotesApi(notes, memos);

  return (
    <div>
      <SettlementHeader
        title="자사 프로모션"
        actions={
          <Link
            href="/settlement/promo/settings"
            className="flex items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-card px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface"
          >
            <Settings size={15} />
            설정
          </Link>
        }
      />
      <PromoSettlementView data={data} today={today} notesApi={notesApi} terminated={terminated} />
    </div>
  );
}
