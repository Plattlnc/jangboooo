"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import type { DailySettlement, DailySettlementRow, DailyTotals } from "@/app/settlement/_lib/daily";
import { WITHHOLDING_RATE, INSURANCE_RATE, PER_COMPLETED_FEE } from "@/app/settlement/_lib/rates";
import { ymdAdd, formatKoreanDate } from "@/app/settlement/_lib/dates";

// 일일 정산 뷰 — 선택일 라이더별 배달처리비/미션비 세전 → 원천세(3.3%)·고용산재(1.8%) 공제 → 지급액.
// 데스크톱 퍼스트: 그룹 헤더 13컬럼 데이터 테이블 + 검색/정렬/날짜이동/CSV.

type SortKey = "name" | "completed" | "fee" | "total";
type SortDir = "asc" | "desc";

const won = (n: number) => n.toLocaleString("ko-KR");
const ded = (n: number) => (n > 0 ? `−${won(n)}` : "0"); // 공제 표기(0이면 −0 대신 0)
const WHT_PCT = `${(WITHHOLDING_RATE * 100).toFixed(1)}%`; // 3.3%
const INS_PCT = `${(INSURANCE_RATE * 100).toFixed(1)}%`; // 1.8%

export function DailySettlementView({ data, today }: { data: DailySettlement; today: string }) {
  const router = useRouter();
  const { date, rows, totals } = data;

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

  // 화면에 표시 중인(검색 필터 반영) 합계.
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
      "번호", "라이더", "라이더ID", "완료건수",
      "배달처리비(세전)", `원천세(${WHT_PCT})`, `고용산재(${INS_PCT})`, "수수료(건당)", "배달처리비 지급액",
      "미션비(세전)", `원천세(${WHT_PCT})`, `고용산재(${INS_PCT})`, "미션비 지급액",
      "총지급액",
    ];
    const body = view.map((r, i) => [
      i + 1, r.name, r.riderId, r.completed,
      r.fee, r.feeWht, r.feeIns, r.feeFee, r.feePayout,
      r.mission, r.missionWht, r.missionIns, r.missionPayout,
      r.total,
    ]);
    const foot = [
      "합계", "", "", vTotals.completed,
      vTotals.fee, vTotals.feeWht, vTotals.feeIns, vTotals.feeFee, vTotals.feePayout,
      vTotals.mission, vTotals.missionWht, vTotals.missionIns, vTotals.missionPayout,
      vTotals.total,
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
      {/* 헤더 + 날짜 이동 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">일일 정산</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            세전에서 원천세 {WHT_PCT} · 고용산재 {INS_PCT} 공제, 배달처리비는 수수료(완료건당 {won(PER_COMPLETED_FEE)}원) 추가 공제 후 지급액. 배달처리비는 익일 오전 반영.
          </p>
        </div>
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

      {/* 최상위 요약 카드 — 표시 중 데이터 기준 */}
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-surface px-2.5 py-1.5">
              <Search size={15} className="text-jb-ink-mute" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="이름·ID 검색"
                className="w-[130px] bg-transparent text-[13px] text-jb-ink outline-none placeholder:text-jb-ink-mute"
              />
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={view.length === 0}
              className="flex items-center gap-1.5 rounded-[10px] bg-jb-indigo px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Download size={15} />
              CSV 내보내기
            </button>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] border-collapse text-[13px]">
              <thead className="text-jb-ink-mute">
                <tr className="bg-jb-surface text-[12px] font-medium">
                  <th rowSpan={2} className="border-b border-jb-line px-3 py-2.5 text-right">#</th>
                  <SortableTh rowSpan={2} label="라이더" onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir} align="left" />
                  <th rowSpan={2} className="border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
                  <SortableTh rowSpan={2} label="완료" onClick={() => toggleSort("completed")} active={sortKey === "completed"} dir={sortDir} align="right" />
                  <th colSpan={5} className="border-b border-l border-jb-line px-3 py-2 text-center font-semibold text-jb-ink">배달처리비</th>
                  <th colSpan={4} className="border-b border-l border-jb-line px-3 py-2 text-center font-semibold text-jb-ink">미션비</th>
                  <SortableTh rowSpan={2} label="총 지급액" onClick={() => toggleSort("total")} active={sortKey === "total"} dir={sortDir} align="right" className="border-l border-jb-line" />
                </tr>
                <tr className="bg-jb-surface text-[11.5px] font-medium">
                  <SortableTh label="세전" onClick={() => toggleSort("fee")} active={sortKey === "fee"} dir={sortDir} align="right" className="border-l border-jb-line" />
                  <th className="border-b border-jb-line px-3 py-2 text-right">원천세 {WHT_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2 text-right">고용산재 {INS_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2 text-right">수수료 <span className="font-normal text-jb-ink-mute">건당 {won(PER_COMPLETED_FEE)}</span></th>
                  <th className="border-b border-jb-line px-3 py-2 text-right font-semibold text-jb-ink">지급액</th>
                  <th className="border-b border-l border-jb-line px-3 py-2 text-right">세전</th>
                  <th className="border-b border-jb-line px-3 py-2 text-right">원천세 {WHT_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2 text-right">고용산재 {INS_PCT}</th>
                  <th className="border-b border-jb-line px-3 py-2 text-right font-semibold text-jb-ink">지급액</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <Row key={r.riderId} row={r} index={i + 1} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-jb-line bg-jb-surface text-[13px] font-semibold text-jb-ink">
                  <td className="px-3 py-3 text-right text-jb-ink-mute" colSpan={3}>합계 · {won(view.length)}명</td>
                  <Num v={vTotals.completed} />
                  <Num v={vTotals.fee} className="border-l border-jb-line" />
                  <Num v={vTotals.feeWht} deduct />
                  <Num v={vTotals.feeIns} deduct />
                  <Num v={vTotals.feeFee} deduct />
                  <Num v={vTotals.feePayout} />
                  <Num v={vTotals.mission} className="border-l border-jb-line" />
                  <Num v={vTotals.missionWht} deduct />
                  <Num v={vTotals.missionIns} deduct />
                  <Num v={vTotals.missionPayout} />
                  <Num v={vTotals.total} className="border-l border-jb-line text-jb-indigo" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function sumRows(rows: DailySettlementRow[]): DailyTotals {
  const t: DailyTotals = { riders: rows.length, completed: 0, fee: 0, feeWht: 0, feeIns: 0, feeFee: 0, feePayout: 0, mission: 0, missionWht: 0, missionIns: 0, missionPayout: 0, total: 0 };
  for (const r of rows) {
    t.completed += r.completed;
    t.fee += r.fee; t.feeWht += r.feeWht; t.feeIns += r.feeIns; t.feeFee += r.feeFee; t.feePayout += r.feePayout;
    t.mission += r.mission; t.missionWht += r.missionWht; t.missionIns += r.missionIns; t.missionPayout += r.missionPayout;
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
      <div className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.01em] ${accent ? "text-jb-indigo" : "text-jb-ink"}`}>
        {value}
      </div>
    </div>
  );
}

function SortableTh({
  label, onClick, active, dir, align, rowSpan, className = "",
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  align: "left" | "right";
  rowSpan?: number;
  className?: string;
}) {
  return (
    <th rowSpan={rowSpan} className={`border-b border-jb-line px-3 py-2.5 ${align === "right" ? "text-right" : "text-left"} ${className}`}>
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

function Row({ row, index }: { row: DailySettlementRow; index: number }) {
  return (
    <tr className="border-b border-jb-line-soft transition-colors hover:bg-jb-surface/60">
      <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="px-3 py-2.5 font-medium text-jb-ink">{row.name}</td>
      <td className="px-3 py-2.5 font-mono text-[12px] text-jb-ink-mute">{row.riderId}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{won(row.completed)}</td>
      {/* 배달처리비 그룹 */}
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.fee)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeWht)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeIns)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.feeFee)}</td>
      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-ink">{won(row.feePayout)}</td>
      {/* 미션비 그룹 (수수료 없음) */}
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.mission)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.missionWht)}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-red">{ded(row.missionIns)}</td>
      <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-ink">{won(row.missionPayout)}</td>
      {/* 총 지급액 */}
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-indigo">{won(row.total)}</td>
    </tr>
  );
}
