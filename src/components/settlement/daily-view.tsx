"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import type { DailySettlement, DailySettlementRow } from "@/app/settlement/_lib/daily";
import { ymdAdd, formatKoreanDate } from "@/app/settlement/_lib/dates";

// 일일 정산 뷰 — 선택일 라이더별 배달처리비(세전) 목록. 정산팀 송금 기반.
// 데스크톱 퍼스트: 넓은 데이터 테이블 + 검색/정렬/날짜이동/CSV 내보내기.

type SortKey = "name" | "completed" | "fee" | "mission" | "total";
type SortDir = "asc" | "desc";

const won = (n: number) => n.toLocaleString("ko-KR");

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

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function exportCsv() {
    const head = ["라이더명", "라이더ID", "연락처", "완료건수", "배달처리비(세전)", "미션", "총지급"];
    const body = view.map((r) => [r.name, r.riderId, r.phone ?? "", r.completed, r.fee, r.mission, r.total]);
    const foot = ["합계", "", "", totals.completed, totals.fee, totals.mission, totals.total];
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
      {/* 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">일일 정산</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            선택일의 라이더별 배달처리비(세전) — 송금 대상 목록. 배달처리비는 익일 오전에 반영됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="지급 대상" value={`${won(totals.riders)}명`} />
        <SummaryCard label="총 완료건수" value={`${won(totals.completed)}건`} />
        <SummaryCard label="총 배달처리비" value={`${won(totals.fee)}원`} />
        <SummaryCard label="총 지급액" value={`${won(totals.total)}원`} accent />
      </div>

      {/* 테이블 카드 */}
      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        {/* 툴바 */}
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
            <table className="w-full min-w-[720px] border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-jb-surface text-[12px] font-medium text-jb-ink-mute">
                  <Th className="w-12 text-right">#</Th>
                  <Th onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                    라이더
                  </Th>
                  <Th className="text-left">라이더 ID</Th>
                  <Th onClick={() => toggleSort("completed")} active={sortKey === "completed"} dir={sortDir} align="right">
                    완료
                  </Th>
                  <Th onClick={() => toggleSort("fee")} active={sortKey === "fee"} dir={sortDir} align="right">
                    배달처리비(세전)
                  </Th>
                  <Th onClick={() => toggleSort("mission")} active={sortKey === "mission"} dir={sortDir} align="right">
                    미션
                  </Th>
                  <Th onClick={() => toggleSort("total")} active={sortKey === "total"} dir={sortDir} align="right">
                    총 지급
                  </Th>
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <Row key={r.riderId} row={r} index={i + 1} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-jb-line bg-jb-surface font-semibold text-jb-ink">
                  <td className="px-3.5 py-3 text-right text-jb-ink-mute" colSpan={3}>
                    합계 · {won(view.length)}명
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono tabular-nums">{won(sumOf(view, "completed"))}</td>
                  <td className="px-3.5 py-3 text-right font-mono tabular-nums">{won(sumOf(view, "fee"))}</td>
                  <td className="px-3.5 py-3 text-right font-mono tabular-nums">{won(sumOf(view, "mission"))}</td>
                  <td className="px-3.5 py-3 text-right font-mono tabular-nums text-jb-indigo">
                    {won(sumOf(view, "total"))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function sumOf(rows: DailySettlementRow[], key: "completed" | "fee" | "mission" | "total"): number {
  return rows.reduce((a, r) => a + r[key], 0);
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[12px] border border-jb-line bg-jb-card px-4 py-3.5 shadow-[var(--toss-shadow)]">
      <div className="text-[12.5px] text-jb-ink-mute">{label}</div>
      <div
        className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.01em] ${accent ? "text-jb-indigo" : "text-jb-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: SortDir;
  align?: "left" | "right";
  className?: string;
}) {
  const alignCls = align === "right" ? "text-right" : "text-left";
  return (
    <th className={`border-b border-jb-line px-3.5 py-2.5 ${alignCls} ${className}`}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1 ${align === "right" ? "flex-row-reverse" : ""} ${active ? "text-jb-ink" : "hover:text-jb-ink-soft"}`}
        >
          {children}
          {active ? dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Row({ row, index }: { row: DailySettlementRow; index: number }) {
  return (
    <tr className="border-b border-jb-line-soft transition-colors hover:bg-jb-surface/60">
      <td className="px-3.5 py-2.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="px-3.5 py-2.5 font-medium text-jb-ink">{row.name}</td>
      <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-jb-ink-mute">{row.riderId}</td>
      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{won(row.completed)}</td>
      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.fee)}</td>
      <td className="px-3.5 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{won(row.mission)}</td>
      <td className="px-3.5 py-2.5 text-right font-mono font-semibold tabular-nums text-jb-ink">{won(row.total)}</td>
    </tr>
  );
}
