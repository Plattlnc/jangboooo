"use client";

import { useMemo, useState, memo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import type { DailySettlement, DailySettlementRow, DailyTotals } from "@/app/settlement/_lib/daily";
import { WITHHOLDING_RATE, INSURANCE_RATE, PER_COMPLETED_FEE } from "@/app/settlement/_lib/rates";
import { ymdAdd, formatKoreanDate } from "@/app/settlement/_lib/dates";
import { NotesSaveButton, type NotesApi } from "./notes-api";
import { DualScrollX } from "./dual-scroll";
import { TerminatedBadge } from "./terminated-badge";

// 일일 정산 뷰 — 선택일 라이더별 배달처리비(세전)에서 원천세·고용산재·수수료(완료건당 100원) 공제 → 지급액.
// 미션비 제외(일일정산 대상 아님). 데스크톱 퍼스트: 데이터 테이블 + 검색/정렬/날짜이동/CSV.

type SortKey = "name" | "completed" | "fee" | "total";
type SortDir = "asc" | "desc";

const won = (n: number) => n.toLocaleString("ko-KR");
const ded = (n: number) => (n > 0 ? `−${won(n)}` : "0"); // 공제 표기(0이면 −0 대신 0)
const WHT_PCT = `${(WITHHOLDING_RATE * 100).toFixed(1)}%`; // 3.3%
const INS_PCT = `${(INSURANCE_RATE * 100).toFixed(1)}%`; // 1.8%

export function DailySettlementView({
  data,
  today,
  notesApi,
  terminated,
}: {
  data: DailySettlement;
  today: string;
  notesApi: NotesApi;
  terminated?: string[];
}) {
  const router = useRouter();
  const termSet = useMemo(() => new Set(terminated ?? []), [terminated]);
  const { date, rows } = data;

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const goDate = (d: string) => router.push(`/settlement/daily?date=${d}`);
  const canNext = date < today;

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter(
          (r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle),
        )
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko") * dir;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [rows, q, sortKey, sortDir]);

  const vTotals = useMemo(() => sumRows(view), [view]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function exportCsv() {
    const head = [
      "번호", "라이더", "메모", "라이더ID", "완료건수",
      "배달처리비(세전)", `원천세(${WHT_PCT})`, `고용산재(${INS_PCT})`, "수수료(건당)", "지급액", "특이사항",
    ];
    const body = view.map((r, i) => [
      i + 1, r.name, notesApi.memos[r.riderId] ?? "", r.riderId, r.completed, r.fee, r.feeWht, r.feeIns, r.feeFee, r.feePayout,
      notesApi.notes[r.riderId] ?? "",
    ]);
    const foot = [
      "합계", "", "", "", vTotals.completed,
      vTotals.fee, vTotals.feeWht, vTotals.feeIns, vTotals.feeFee, vTotals.feePayout, "",
    ];
    const csv = [head, ...body, foot]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `슬라이더_일일정산_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 설명 + 날짜 이동 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-jb-ink-mute">
          배달처리비(세전)에서 원천세 {WHT_PCT} · 고용산재 {INS_PCT} · 수수료(완료건당 {won(PER_COMPLETED_FEE)}원) 공제 후 지급액. 배달처리비는 익일 오전 반영.
        </p>
        <div className="flex items-center rounded-[10px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
          <button
            type="button"
            onClick={() => goDate(ymdAdd(date, -1))}
            aria-label="이전 날짜"
            className="grid size-9 place-items-center rounded-l-[10px] text-jb-ink-soft hover:bg-jb-surface"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && goDate(e.target.value)}
            className="border-x border-jb-line bg-transparent px-3 py-2 text-[13.5px] font-medium text-jb-ink outline-none"
          />
          <button
            type="button"
            onClick={() => canNext && goDate(ymdAdd(date, 1))}
            disabled={!canNext}
            aria-label="다음 날짜"
            className="grid size-9 place-items-center rounded-r-[10px] text-jb-ink-soft hover:bg-jb-surface disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 최상위 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="지급 대상" value={`${won(view.length)}명`} />
        <SummaryCard label="총 완료건수" value={`${won(vTotals.completed)}건`} />
        <SummaryCard label="총 배달처리비" value={`${won(vTotals.fee)}원`} sub="세전" />
        <SummaryCard label="총 지급액" value={`${won(vTotals.total)}원`} sub="공제 후" accent />
      </div>

      {/* 테이블 카드 */}
      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jb-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-jb-ink">{formatKoreanDate(date)}</span>
            <span className="text-[12.5px] text-jb-ink-mute">{view.length}명 표시</span>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-surface px-2.5 py-1.5 sm:flex-none">
              <Search size={15} className="shrink-0 text-jb-ink-mute" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름·ID 검색"
                className="w-full min-w-0 bg-transparent text-[13px] text-jb-ink outline-none placeholder:text-jb-ink-mute sm:w-[130px]"
              />
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={view.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-card px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-40"
            >
              <Download size={15} />
              CSV<span className="hidden sm:inline"> 내보내기</span>
            </button>
            <NotesSaveButton api={notesApi} />
          </div>
        </div>

        {view.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-[14px] font-medium text-jb-ink">해당 날짜의 정산 데이터가 없습니다.</p>
            <p className="mt-1 text-[13px] text-jb-ink-mute">
              배달처리비는 익일 오전 8시 이후 반영됩니다. 날짜를 확인해 주세요.
            </p>
          </div>
        ) : (
          <DualScrollX>
            <table className="w-full whitespace-nowrap border-collapse text-[13px]">
              <thead className="text-jb-ink-mute">
                <tr className="bg-jb-surface text-[12px] font-medium">
                  <th className="sticky left-0 z-10 w-[40px] min-w-[40px] max-w-[40px] border-b border-jb-line bg-jb-surface px-2 py-2.5 text-right">#</th>
                  <SortableTh label="라이더" onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir} align="left" className="sticky left-[40px] z-10 min-w-[96px] bg-jb-surface" />
                  <th className="w-[280px] min-w-[280px] border-b border-jb-line px-3 py-2.5 text-left">메모</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
                  <SortableTh label="완료" onClick={() => toggleSort("completed")} active={sortKey === "completed"} dir={sortDir} align="right" />
                  <SortableTh label="배달처리비(세전)" onClick={() => toggleSort("fee")} active={sortKey === "fee"} dir={sortDir} align="right" className="border-l border-jb-line" />
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">원천세 {WHT_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">고용산재 {INS_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">수수료 <span className="font-normal text-jb-ink-mute">건당 {won(PER_COMPLETED_FEE)}</span></th>
                  <SortableTh label="지급액" onClick={() => toggleSort("total")} active={sortKey === "total"} dir={sortDir} align="right" className="border-l border-jb-line font-semibold text-jb-ink" />
                  <th className="w-[240px] min-w-[240px] border-b border-l border-jb-line px-3 py-2.5 text-left">특이사항</th>
                  <th className="w-full border-b border-jb-line p-0" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <Row
                    key={r.riderId}
                    row={r}
            isTerminated={termSet.has(r.riderId)}
                    index={i + 1}
                    memo={notesApi.memos[r.riderId] ?? ""}
                    onMemo={notesApi.setMemo}
                    note={notesApi.notes[r.riderId] ?? ""}
                    onNote={notesApi.setNote}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-jb-line bg-jb-surface text-[13px] font-semibold text-jb-ink">
                  <td className="sticky left-0 z-10 bg-jb-surface px-3 py-3 text-right text-jb-ink-mute" colSpan={4}>합계 · {won(view.length)}명</td>
                  <Num v={vTotals.completed} />
                  <Num v={vTotals.fee} className="border-l border-jb-line" />
                  <Num v={vTotals.feeWht} deduct />
                  <Num v={vTotals.feeIns} deduct />
                  <Num v={vTotals.feeFee} deduct />
                  <Num v={vTotals.total} className="border-l border-jb-line text-jb-indigo" />
                  <td className="border-l border-jb-line-soft" />
                  <td className="p-0" aria-hidden />
                </tr>
              </tfoot>
            </table>
          </DualScrollX>
        )}
      </div>
    </div>
  );
}

function sumRows(rows: DailySettlementRow[]): DailyTotals {
  const t: DailyTotals = { riders: rows.length, completed: 0, fee: 0, feeWht: 0, feeIns: 0, feeFee: 0, feePayout: 0, total: 0 };
  for (const r of rows) {
    t.completed += r.completed;
    t.fee += r.fee; t.feeWht += r.feeWht; t.feeIns += r.feeIns; t.feeFee += r.feeFee; t.feePayout += r.feePayout;
    t.total += r.total;
  }
  return t;
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-[12px] border border-jb-line bg-jb-card px-4 py-3.5 shadow-[var(--toss-shadow)]">
      <div className="flex items-center gap-1.5">
        <span className="text-[12.5px] text-jb-ink-mute">{label}</span>
        {sub ? <span className="rounded-[5px] bg-jb-surface px-1 py-0.5 text-[10px] font-medium text-jb-ink-mute">{sub}</span> : null}
      </div>
      <div className={`mt-1 break-keep font-mono text-[17px] font-semibold tabular-nums tracking-[-0.01em] sm:text-[20px] ${accent ? "text-jb-indigo" : "text-jb-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function SortableTh({
  label, onClick, active, dir, align, className = "",
}: {
  label: ReactNode;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  className?: string;
}) {
  return (
    <th className={`border-b border-jb-line px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-jb-ink" : "hover:text-jb-ink-soft"}`}
      >
        {label}
        {active ? dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
      </button>
    </th>
  );
}

function Num({ v, deduct, className = "" }: { v: number; deduct?: boolean; className?: string }) {
  return (
    <td className={`px-3 py-3 text-right font-mono tabular-nums ${deduct ? "text-jb-red" : ""} ${className}`}>
      {deduct ? ded(v) : won(v)}
    </td>
  );
}

const Row = memo(function Row({
  row,
  isTerminated,
  index,
  memo: memoVal,
  onMemo,
  note,
  onNote,
}: {
  row: DailySettlementRow;
  isTerminated: boolean;
  index: number;
  memo: string;
  onMemo: (id: string, val: string) => void;
  note: string;
  onNote: (id: string, val: string) => void;
}) {
  return (
    <tr className="border-b border-jb-line-soft transition-colors hover:bg-jb-surface/60">
      <td className="sticky left-0 z-10 w-[40px] min-w-[40px] max-w-[40px] bg-jb-card px-2 py-2.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="sticky left-[40px] z-10 bg-jb-card px-3 py-2.5 font-medium text-jb-ink">{row.name}{isTerminated ? <TerminatedBadge /> : null}</td>
      <td className="px-2 py-1.5">
        <input
          value={memoVal}
          onChange={(e) => onMemo(row.riderId, e.target.value)}
          placeholder="메모…"
          className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
        />
      </td>
      <td className="px-3 py-2.5 font-mono text-[12px] text-jb-ink-mute">{row.riderId}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{won(row.completed)}</td>
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.fee)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeWht)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeIns)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeFee)}</td>
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-indigo">{won(row.total)}</td>
      <td className="border-l border-jb-line-soft px-2 py-1.5">
        <input
          value={note}
          onChange={(e) => onNote(row.riderId, e.target.value)}
          placeholder="특이사항…"
          className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
        />
      </td>
      <td className="p-0" aria-hidden />
    </tr>
  );
});
