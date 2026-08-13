"use client";

import type { PromoSettlement } from "@/app/settlement/_lib/promo";
import { PromoSettlementView } from "./promo-view";
import { useRiderNotesApi } from "./notes-api";

// 자사 프로모션 — 정산 내역 테이블(메모·특이사항 인라인, 라이더 설정과 공유 데이터).
export function PromoTabs({
  data,
  period,
  today,
  notes,
  memos,
}: {
  data: PromoSettlement;
  period: "daily" | "weekly";
  today: string;
  notes: Record<string, string>;
  memos: Record<string, string>;
}) {
  const notesApi = useRiderNotesApi(notes, memos);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">자사 프로모션</h1>
      <PromoSettlementView data={data} period={period} today={today} notesApi={notesApi} />
    </div>
  );
}
