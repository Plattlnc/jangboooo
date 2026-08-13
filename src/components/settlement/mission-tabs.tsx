"use client";

import type { MissionSettlement } from "@/app/settlement/_lib/mission";
import { MissionSettlementView } from "./mission-view";
import { useRiderNotesApi } from "./notes-api";

// 본사 미션 — 정산 내역 테이블(메모·특이사항 컬럼 포함). 정보 입력은 라이더 설정 페이지에서 중앙 관리하며
// 여기 인라인 컬럼은 동일 데이터를 그대로 반영/편집한다(별도 기타 탭 없음).
export function MissionTabs({
  data,
  period,
  today,
  notes,
  memos,
}: {
  data: MissionSettlement;
  period: "daily" | "weekly";
  today: string;
  notes: Record<string, string>;
  memos: Record<string, string>;
}) {
  const notesApi = useRiderNotesApi(notes, memos);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">본사 미션</h1>
      <MissionSettlementView data={data} period={period} today={today} notesApi={notesApi} />
    </div>
  );
}
