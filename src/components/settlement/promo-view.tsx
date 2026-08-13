"use client";

import { useMemo, useState, memo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search, ArrowUp, ArrowDown } from "lucide-react";
import type { PromoSettlement, PromoSettlementRow, PromoTotals } from "@/app/settlement/_lib/promo";
import { PROMO_WEEKLY_THRESHOLD, PROMO_UNIT_KRW } from "@/lib/promo";
import { ymdAdd, formatKoreanDate } from "@/app/settlement/_lib/dates";
import { NotesSaveButton, type NotesApi } from "./notes-api";

// 자사 프로모션 정산 뷰 — [일일/주간]. 09:00~00:00 완료건을 프로모션 개수로 인정.
// 주간(수~화) 100건 초과분 건당 2,000원 지급. 일일은 그날 개수만(지급은 주간 기준).

type Period = "daily" | "weekly";
type SortKey = "name" | "promoCount" | "payout";
type SortDir = "asc" | "desc";

const won = (n: number) => n.toLocaleString("ko-KR");

export function PromoSettlementView({
  data,
  period,
  today,
  notesApi,
}: {
  data: PromoSettlement;
  period: Period;
  today: string;
  notesApi: NotesApi;
}) {
  const router = useRouter();
  const { start, end, rows } = data;
  const weekly = period === "weekly";

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(weekly ? "payout" : "promoCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const go = (p: Period, ref: string) => router.push(`/settlement/promo?period=${p}&date=${ref}`);
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
  const paidCount = useMemo(() => view.filter((r) => r.payout > 0).length, [view]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const rangeLabel = weekly ? `${start} ~ ${end}` : formatKoreanDate(start);

  function exportCsv() {
    const head = weekly
      ? ["번호", "라이더", "메모", "라이더ID", "완료(09~00시)", "100초과", "지급액", "특이사항"]
      : ["번호", "라이더", "메모", "라이더ID", "완료(09~00시)", "특이사항"];
    const body = view.map((r, i) => {
      const memo = notesApi.memos[r.riderId] ?? "";
      const note = notesApi.notes[r.riderId] ?? "";
      return weekly
        ? [i + 1, r.name, memo, r.riderId, r.promoCount, r.over, r.payout, note]
        : [i + 1, r.name, memo, r.riderId, r.promoCount, note];
    });
    const foot = weekly
      ? ["합계", "", "", "", vTotals.promoCount, vTotals.over, vTotals.payout, ""]
      : ["합계", "", "", "", vTotals.promoCount, ""];
    const csv = [head, ...body, foot]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `슬라이더_자사프로모션_${weekly ? `${start}_${end}` : start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 기간 선택 + 네비게이션 */}
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
        운영시간 <span className="font-semibold text-jb-ink-soft">09:00~00:00</span> 완료건을 자사 프로모션 개수로 집계.
        {weekly
          ? ` 주간(수~화) ${won(PROMO_WEEKLY_THRESHOLD)}건 초과분(101건째부터) 건당 ${won(PROMO_UNIT_KRW)}원 지급.`
          : ` 지급은 주간 ${won(PROMO_WEEKLY_THRESHOLD)}건 초과분 × ${won(PROMO_UNIT_KRW)}원 기준(주간 탭).`}
      </p>

      {/* 요약 카드 */}
      <div className={`grid grid-cols-2 gap-3 ${weekly ? "sm:grid-cols-4" : "sm:grid-cols-2"}`}>
        <SummaryCard label="대상 라이더" value={`${won(view.length)}명`} />
        <SummaryCard label="총 완료" value={`${won(vTotals.promoCount)}건`} sub="09~00시" />
        {weekly ? <SummaryCard label="지급 라이더" value={`${won(paidCount)}명`} sub="100건 초과" /> : null}
        {weekly ? <SummaryCard label="총 지급액" value={`${won(vTotals.payout)}원`} accent /> : null}
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
            <p className="text-[14px] font-medium text-jb-ink">해당 기간의 프로모션 완료 내역이 없습니다.</p>
            <p className="mt-1 text-[13px] text-jb-ink-mute">09~00시 완료가 있는 기간을 선택해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[13px] ${weekly ? "min-w-[1040px]" : "min-w-[820px]"}`}>
              <thead className="text-jb-ink-mute">
                <tr className="bg-jb-surface text-[12px] font-medium">
                  <th className="border-b border-jb-line px-3 py-2.5 text-right">#</th>
                  <SortableTh label="라이더" onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir} align="left" />
                  <th className="w-[200px] border-b border-jb-line px-3 py-2.5 text-left">메모</th>
                  <th className="border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
                  <SortableTh label="완료 09~00시" onClick={() => toggleSort("promoCount")} active={sortKey === "promoCount"} dir={sortDir} align="right" className="border-l border-jb-line" />
                  {weekly ? <th className="border-b border-jb-line px-3 py-2.5 text-right">100 초과</th> : null}
                  {weekly ? (
                    <SortableTh label="지급액" onClick={() => toggleSort("payout")} active={sortKey === "payout"} dir={sortDir} align="right" className="border-l border-jb-line font-semibold text-jb-ink" />
                  ) : null}
                  <th className="w-[240px] border-b border-l border-jb-line px-3 py-2.5 text-left">특이사항</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <Row
                    key={r.riderId}
                    row={r}
                    index={i + 1}
                    weekly={weekly}
                    memo={notesApi.memos[r.riderId] ?? ""}
                    onMemo={notesApi.setMemo}
                    note={notesApi.notes[r.riderId] ?? ""}
                    onNote={notesApi.setNote}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-jb-line bg-jb-surface text-[13px] font-semibold text-jb-ink">
                  <td className="px-3 py-3 text-right text-jb-ink-mute" colSpan={4}>합계 · {won(view.length)}명</td>
                  <td className="border-l border-jb-line px-3 py-3 text-right font-mono tabular-nums">{won(vTotals.promoCount)}</td>
                  {weekly ? <td className="px-3 py-3 text-right font-mono tabular-nums text-jb-ink-soft">{won(vTotals.over)}</td> : null}
                  {weekly ? (
                    <td className="border-l border-jb-line px-3 py-3 text-right font-mono tabular-nums text-jb-indigo">{won(vTotals.payout)}</td>
                  ) : null}
                  <td className="border-l border-jb-line-soft" />
                </tr>
              </tfoot>
            </table>
          </div>
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

function sumRows(rows: PromoSettlementRow[]): PromoTotals {
  const t: PromoTotals = { riders: rows.length, promoCount: 0, over: 0, payout: 0 };
  for (const r of rows) {
    t.promoCount += r.promoCount;
    t.over += r.over;
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

const Row = memo(function Row({
  row,
  index,
  weekly,
  memo: memoVal,
  onMemo,
  note,
  onNote,
}: {
  row: PromoSettlementRow;
  index: number;
  weekly: boolean;
  memo: string;
  onMemo: (id: string, val: string) => void;
  note: string;
  onNote: (id: string, val: string) => void;
}) {
  return (
    <tr className="border-b border-jb-line-soft transition-colors hover:bg-jb-surface/60">
      <td className="px-3 py-2.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="px-3 py-2.5 font-medium text-jb-ink">{row.name}</td>
      <td className="px-2 py-1.5">
        <input
          value={memoVal}
          onChange={(e) => onMemo(row.riderId, e.target.value)}
          placeholder="메모…"
          className="w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
        />
      </td>
      <td className="px-3 py-2.5 font-mono text-[12px] text-jb-ink-mute">{row.riderId}</td>
      <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink">{won(row.promoCount)}</td>
      {weekly ? (
        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{row.over > 0 ? won(row.over) : "0"}</td>
      ) : null}
      {weekly ? (
        <td className="border-l border-jb-line-soft px-3 py-2.5 text-right font-mono font-bold tabular-nums text-jb-indigo">{won(row.payout)}</td>
      ) : null}
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
