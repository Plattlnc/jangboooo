"use client";

import { useMemo, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import type { MonthlySettlement } from "@/app/settlement/_lib/monthly";
import { ymAdd, mdShort } from "@/app/settlement/_lib/dates";

// 월 소득정산서(세무사용) — 라이더별 × 주차별 세전 소득(배달처리비 + 기타/인센티브) 통합. 소득합계 = 월 지급 세전 총액.
const won = (n: number) => (n ? n.toLocaleString("ko-KR") : "-");
const COMPANY_TITLE = "(주식회사 디앤인베스트먼트) 인천서구8B 라이더별 세전(원천징수 전) 소득 정산서";

export function MonthlyStatementView({
  data,
  thisMonth,
  notes,
}: {
  data: MonthlySettlement;
  thisMonth: string;
  notes: Record<string, string>;
}) {
  const router = useRouter();
  const { ym, weeks, rows, totals } = data;
  const [q, setQ] = useState("");

  const go = (m: string) => router.push(`/settlement/weekly?month=${m}`);
  const canNext = ym < thisMonth;

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle));
  }, [rows, q]);

  function exportCsv() {
    const head = ["번호", "라이더명", "주민등록번호"];
    weeks.forEach((w, i) => head.push(`${i + 1}주차(${mdShort(w.start)}~${mdShort(w.end)}) 배달처리비`, `${i + 1}주차 기타/인센티브`));
    head.push("소득합계금액", "비고", "참고(UID)");
    const body = view.map((r, i) => {
      const cols: (string | number)[] = [i + 1, r.name, r.rrn];
      r.weeks.forEach((c) => cols.push(c.delivery, c.etc));
      cols.push(r.total, notes[r.riderId] ?? "", r.riderId);
      return cols;
    });
    const foot: (string | number)[] = ["합계", "", ""];
    totals.perWeek.forEach((c) => foot.push(c.delivery, c.etc));
    foot.push(totals.total, "", "");
    const csv = [head, ...body, foot]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `소득정산서_인천서구8B_${ym}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-[12.5px] text-jb-ink-mute">{COMPANY_TITLE}</p>

      {/* 월 선택 + 검색/CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center rounded-[10px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
          <button type="button" onClick={() => go(ymAdd(ym, -1))} aria-label="이전 달" className="grid size-9 place-items-center rounded-l-[10px] text-jb-ink-soft hover:bg-jb-surface">
            <ChevronLeft size={18} />
          </button>
          <span className="tnum border-x border-jb-line px-4 py-2 text-[14px] font-semibold text-jb-ink">{ym}</span>
          <button type="button" onClick={() => canNext && go(ymAdd(ym, 1))} disabled={!canNext} aria-label="다음 달" className="grid size-9 place-items-center rounded-r-[10px] text-jb-ink-soft hover:bg-jb-surface disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-surface px-2.5 py-1.5 sm:flex-none">
            <Search size={15} className="shrink-0 text-jb-ink-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·ID 검색" className="w-full min-w-0 bg-transparent text-[13px] text-jb-ink outline-none placeholder:text-jb-ink-mute sm:w-[130px]" />
          </div>
          <button type="button" onClick={exportCsv} disabled={view.length === 0} className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-card px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-40">
            <Download size={15} />
            CSV<span className="hidden sm:inline"> 내보내기</span>
          </button>
        </div>
      </div>

      {/* 요약 — 배달처리비 / 본사미션 / 자사프로모션 분리 + 소득합계 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard label="대상 라이더" value={`${view.length.toLocaleString("ko-KR")}명`} sub={`${weeks.length}주`} />
        <SummaryCard label="배달처리비" value={`${totals.delivery.toLocaleString("ko-KR")}원`} sub="세전" />
        <SummaryCard label="본사미션" value={`${totals.mission.toLocaleString("ko-KR")}원`} sub="세전" />
        <SummaryCard label="자사프로모션" value={`${totals.promo.toLocaleString("ko-KR")}원`} sub="세전" />
        <SummaryCard label="총 소득합계" value={`${totals.total.toLocaleString("ko-KR")}원`} sub="세전" accent />
      </div>
      <p className="-mt-2 text-[12px] text-jb-ink-mute">
        표의 <span className="font-semibold text-jb-ink-soft">배달처리비</span> = 배달처리비 + 본사미션, <span className="font-semibold text-jb-ink-soft">기타/인센티브</span> = 자사프로모션(세전). 소득합계 = 배달처리비 + 기타/인센티브.
      </p>

      {/* 정산서 테이블 */}
      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        {view.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-[14px] font-medium text-jb-ink">{ym} 정산 내역이 없습니다.</p>
            <p className="mt-1 text-[13px] text-jb-ink-mute">배달처리비는 익일 반영됩니다. 다른 달을 선택해 주세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]" style={{ minWidth: 700 + weeks.length * 220 }}>
              <thead className="text-jb-ink-mute">
                <tr className="bg-jb-surface text-[11.5px] font-semibold">
                  <th rowSpan={2} className="border-b border-r border-jb-line px-2 py-2 text-right">No</th>
                  <th rowSpan={2} className="border-b border-r border-jb-line px-3 py-2 text-left">라이더명</th>
                  <th rowSpan={2} className="border-b border-r border-jb-line px-3 py-2 text-left">주민등록번호</th>
                  {weeks.map((w, i) => (
                    <th key={i} colSpan={2} className="border-b border-r border-jb-line px-3 py-2 text-center">
                      {i + 1}주차 <span className="font-medium text-jb-ink-mute">({mdShort(w.start)}~{mdShort(w.end)})</span>
                    </th>
                  ))}
                  <th rowSpan={2} className="border-b border-r border-jb-line px-3 py-2 text-right text-jb-ink">소득합계금액</th>
                  <th rowSpan={2} className="border-b border-r border-jb-line px-3 py-2 text-left">비고</th>
                  <th rowSpan={2} className="border-b border-jb-line px-3 py-2 text-left">참고(UID)</th>
                </tr>
                <tr className="bg-jb-surface text-[11px] font-medium">
                  {weeks.map((_, i) => (
                    <Fragment key={i}>
                      <th className="border-b border-jb-line px-3 py-1.5 text-right">배달처리비<span className="font-normal text-jb-ink-mute"> +본사미션</span></th>
                      <th className="border-b border-r border-jb-line px-3 py-1.5 text-right">기타/인센티브<span className="font-normal text-jb-ink-mute"> (프로모션)</span></th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <tr key={r.riderId} className="border-b border-jb-line-soft hover:bg-jb-surface/50">
                    <td className="border-r border-jb-line-soft px-2 py-2 text-right font-mono text-[11.5px] tabular-nums text-jb-ink-mute">{i + 1}</td>
                    <td className="whitespace-nowrap border-r border-jb-line-soft px-3 py-2 font-medium text-jb-ink">{r.name}</td>
                    <td className="whitespace-nowrap border-r border-jb-line-soft px-3 py-2 font-mono text-[11.5px] text-jb-ink-soft">{r.rrn || "—"}</td>
                    {r.weeks.map((c, wi) => (
                      <Fragment key={wi}>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-jb-ink">{won(c.delivery)}</td>
                        <td className="border-r border-jb-line-soft px-3 py-2 text-right font-mono tabular-nums text-jb-ink-soft">{won(c.etc)}</td>
                      </Fragment>
                    ))}
                    <td className="border-r border-jb-line-soft px-3 py-2 text-right font-mono font-bold tabular-nums text-jb-indigo">{won(r.total)}</td>
                    <td className="whitespace-nowrap border-r border-jb-line-soft px-3 py-2 text-jb-ink-soft">{notes[r.riderId] ?? ""}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-jb-ink-mute">{r.riderId}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-jb-line bg-jb-surface text-[12.5px] font-semibold text-jb-ink">
                  <td className="border-r border-jb-line px-3 py-2.5 text-right text-jb-ink-mute" colSpan={3}>합계 · {view.length}명</td>
                  {totals.perWeek.map((c, wi) => (
                    <Fragment key={wi}>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums">{won(c.delivery)}</td>
                      <td className="border-r border-jb-line-soft px-3 py-2.5 text-right font-mono tabular-nums text-jb-ink-soft">{won(c.etc)}</td>
                    </Fragment>
                  ))}
                  <td className="border-r border-jb-line px-3 py-2.5 text-right font-mono tabular-nums text-jb-indigo">{won(totals.total)}</td>
                  <td className="border-r border-jb-line-soft" />
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
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
