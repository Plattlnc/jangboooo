"use client";

import { useMemo, useState, memo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import type { MissionSettlement, MissionSettlementRow, MissionTotals } from "@/app/settlement/_lib/mission";
import { WITHHOLDING_RATE, INSURANCE_RATE } from "@/app/settlement/_lib/rates";
import { ymdAdd, formatKoreanDate } from "@/app/settlement/_lib/dates";
import { NotesSaveButton, type NotesApi } from "./notes-api";
import { DualScrollX } from "./dual-scroll";

// 본사 미션 정산 뷰 — 상단 [일일/주간]. 라이더별 본사 미션(세전)에서 원천세·고용산재 공제 → 지급액.
// 수수료(완료건당 100원) 미적용. 주간은 수~화 기간 합산. 메모·특이사항은 라이더 설정과 공유.

type Period = "daily" | "weekly";
type SortKey = "name" | "mission" | "payout";
type SortDir = "asc" | "desc";

const won = (n: number) => n.toLocaleString("ko-KR");
const ded = (n: number) => (n > 0 ? `−${won(n)}` : "0");
const WHT_PCT = `${(WITHHOLDING_RATE * 100).toFixed(1)}%`; // 3.3%
const INS_PCT = `${(INSURANCE_RATE * 100).toFixed(1)}%`; // 1.8%

export function MissionSettlementView({
  data,
  period,
  today,
  notesApi,
}: {
  data: MissionSettlement;
  period: Period;
  today: string;
  notesApi: NotesApi;
}) {
  const router = useRouter();
  const { start, end, rows } = data;
  const weekly = period === "weekly";

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("payout");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const go = (p: Period, ref: string) => router.push(`/settlement/mission?period=${p}&date=${ref}`);
  const canNext = weekly ? end < today : start < today;

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? rows.filter((r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle))
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

  const rangeLabel = weekly ? `${start} ~ ${end}` : formatKoreanDate(start);

  function exportCsv() {
    const head = ["번호", "라이더", "메모", "라이더ID", "본사미션(세전)", `원천세(${WHT_PCT})`, `고용산재(${INS_PCT})`, "지급액", "특이사항"];
    const body = view.map((r, i) => [
      i + 1, r.name, notesApi.memos[r.riderId] ?? "", r.riderId, r.mission, r.wht, r.ins, r.payout,
      notesApi.notes[r.riderId] ?? "",
    ]);
    const foot = ["합계", "", "", "", vTotals.mission, vTotals.wht, vTotals.ins, vTotals.payout, ""];
    const csv = [head, ...body, foot]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `슬라이더_본사미션_${weekly ? `${start}_${end}` : start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 기간 선택(일일/주간) + 네비게이션 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <PeriodBtn label="일일" active={!weekly} onClick={() => go("daily", start)} />
          <PeriodBtn label="주간" active={weekly} onClick={() => go("weekly", start)} />
        </div>

        <div className="flex items-center rounded-[10px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
          <button
            type="button"
            onClick={() => go(period, ymdAdd(start, weekly ? -7 : -1))}
            aria-label={weekly ? "이전 주" : "이전 날짜"}
            className="grid size-9 place-items-center rounded-l-[10px] text-jb-ink-soft hover:bg-jb-surface"
          >
            <ChevronLeft size={18} />
          </button>
          {weekly ? (
            <span className="tnum border-x border-jb-line px-3.5 py-2 text-[13px] font-semibold text-jb-ink">
              {start} ~ {end}
            </span>
          ) : (
            <input
              type="date"
              value={start}
              max={today}
              onChange={(e) => e.target.value && go("daily", e.target.value)}
              className="border-x border-jb-line bg-transparent px-3 py-2 text-[13.5px] font-medium text-jb-ink outline-none"
            />
          )}
          <button
            type="button"
            onClick={() => canNext && go(period, ymdAdd(start, weekly ? 7 : 1))}
            disabled={!canNext}
            aria-label={weekly ? "다음 주" : "다음 날짜"}
            className="grid size-9 place-items-center rounded-r-[10px] text-jb-ink-soft hover:bg-jb-surface disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <p className="text-[13px] text-jb-ink-mute">
        {weekly ? "주간(수~화) 합산 " : ""}본사 미션 지급액(세전)에서 원천세 {WHT_PCT} · 고용산재 {INS_PCT} 공제 후 지급액{weekly ? " (기간 합산 기준 공제)" : ""}.
      </p>

      {/* 최상위 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="지급 대상" value={`${won(view.length)}명`} />
        <SummaryCard label="총 본사미션" value={`${won(vTotals.mission)}원`} sub="세전" />
        <SummaryCard label="총 지급액" value={`${won(vTotals.payout)}원`} sub="공제 후" accent />
      </div>

      {/* 테이블 카드 */}
      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jb-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-jb-ink">{rangeLabel}</span>
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
            <p className="text-[14px] font-medium text-jb-ink">해당 기간의 본사 미션 지급 내역이 없습니다.</p>
            <p className="mt-1 text-[13px] text-jb-ink-mute">미션 지급이 있는 기간을 선택해 주세요.</p>
          </div>
        ) : (
          <DualScrollX>
            <table className="w-full min-w-[1000px] border-collapse text-[13px]">
              <thead className="text-jb-ink-mute">
                <tr className="bg-jb-surface text-[12px] font-medium">
                  <th className="sticky left-0 z-10 w-[48px] min-w-[48px] max-w-[48px] border-b border-jb-line bg-jb-surface px-3 py-2.5 text-right">#</th>
                  <SortableTh label="라이더" onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir} align="left" className="sticky left-[48px] z-10 bg-jb-surface" />
                  <th className="w-[200px] border-b border-jb-line px-3 py-2.5 text-left">메모</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
                  <SortableTh label="본사미션(세전)" onClick={() => toggleSort("mission")} active={sortKey === "mission"} dir={sortDir} align="right" className="border-l border-jb-line" />
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">원천세 {WHT_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">고용산재 {INS_PCT}</th>
                  <SortableTh label="지급액" onClick={() => toggleSort("payout")} active={sortKey === "payout"} dir={sortDir} align="right" className="border-l border-jb-line font-semibold text-jb-ink" />
                  <th className="w-[240px] border-b border-l border-jb-line px-3 py-2.5 text-left">특이사항</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <Row
                    key={r.riderId}
                    row={r}
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
                  <Num v={vTotals.mission} className="border-l border-jb-line" />
                  <Num v={vTotals.wht} deduct />
                  <Num v={vTotals.ins} deduct />
                  <Num v={vTotals.payout} className="border-l border-jb-line text-jb-indigo" />
                  <td className="border-l border-jb-line-soft" />
                </tr>
              </tfoot>
            </table>
          </DualScrollX>
        )}
      </div>
    </div>
  );
}

function PeriodBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-[10px] border px-3.5 py-1.5 text-[13px] font-semibold transition-colors " +
        (active ? "border-jb-indigo bg-jb-indigo-tint text-jb-indigo" : "border-jb-line bg-jb-card text-jb-ink-mute hover:bg-jb-surface")
      }
    >
      {label}
    </button>
  );
}

function sumRows(rows: MissionSettlementRow[]): MissionTotals {
  const t: MissionTotals = { riders: rows.length, mission: 0, wht: 0, ins: 0, payout: 0 };
  for (const r of rows) {
    t.mission += r.mission;
    t.wht += r.wht;
    t.ins += r.ins;
    t.payout += r.payout;
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
  index,
  memo: memoVal,
  onMemo,
  note,
  onNote,
}: {
  row: MissionSettlementRow;
  index: number;
  memo: string;
  onMemo: (id: string, val: string) => void;
  note: string;
  onNote: (id: string, val: string) => void;
}) {
  return (
    <tr className="border-b border-jb-line-soft transition-colors hover:bg-jb-surface/60">
      <td className="sticky left-0 z-10 w-[48px] min-w-[48px] max-w-[48px] bg-jb-card px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="sticky left-[48px] z-10 bg-jb-card px-3 py-2.5 font-medium text-jb-ink">{row.name}</td>
      <td className="px-2 py-1.5">
        <input
          value={memoVal}
          onChange={(e) => onMemo(row.riderId, e.target.value)}
          placeholder="메모…"
          className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
        />
      </td>
      <td className="px-3 py-2.5 font-mono text-[12px] text-jb-ink-mute">{row.riderId}</td>
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.mission)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.wht)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.ins)}</td>
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-indigo">{won(row.payout)}</td>
      <td className="border-l border-jb-line-soft px-2 py-1.5">
        <input
          value={note}
          onChange={(e) => onNote(row.riderId, e.target.value)}
          placeholder="특이사항…"
          className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
        />
      </td>
    </tr>
  );
});
