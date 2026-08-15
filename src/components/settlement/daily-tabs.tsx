"use client";

import type { DailySettlement } from "@/app/settlement/_lib/daily";
import { DailySettlementView } from "./daily-view";
import { SettlementHeader } from "./settlement-header";
import { useRiderNotesApi } from "./notes-api";

// 일일 정산 — 정산 내역 테이블(메모·특이사항 컬럼 포함). 정보 입력은 라이더 설정 페이지에서 중앙 관리하며
// 여기 인라인 컬럼은 동일 데이터를 그대로 반영/편집한다(별도 기타 탭 없음).
export function DailyTabs({
  data,
  today,
  notes,
  memos,
  terminated,
}: {
  data: DailySettlement;
  today: string;
  notes: Record<string, string>;
  memos: Record<string, string>;
  terminated?: string[];
}) {
  const notesApi = useRiderNotesApi(notes, memos);

  return (
    <div>
      <SettlementHeader title="일일 정산" />
      <DailySettlementView data={data} today={today} notesApi={notesApi} terminated={terminated} />
    </div>
  );
}
