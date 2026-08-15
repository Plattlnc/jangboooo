"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Receipt } from "lucide-react";
import type { SalesData, SalesWeek, TaxLine } from "@/app/settlement/_lib/sales";
import { SettlementHeader } from "./settlement-header";

// 매출 뷰 — 세금계산서 내역(역발행). 주정산서 갑지 3.세금계산서 내역 기준.
// 매출(공급가액 합계) 히어로 + 라인별(배달료/라이더수수료/관리비/페이백) 공급가액·부가세·공급대가 표 + 주차 추이.
const won = (n: number) => n.toLocaleString("ko-KR");

const LINES: { key: keyof Pick<SalesWeek, "delivery" | "riderFee" | "mgmt" | "payback">; label: string }[] = [
  { key: "delivery", label: "배달료" },
  { key: "riderFee", label: "라이더수수료" },
  { key: "mgmt", label: "관리비" },
  { key: "payback", label: "정산수수료 페이백" },
];

export function SalesView({ data }: { data: SalesData }) {
  const { weeks } = data;
  const [idx, setIdx] = useState(0);
  const week = weeks[idx] as SalesWeek | undefined;
  const prev = weeks[idx + 1];
  const maxSum = Math.max(1, ...weeks.map((w) => w.sum.supply));

  function exportCsv() {
    const head = ["주 시작", "주 끝", "구분", "공급가액", "부가세액", "공급대가"];
    const body: (string | number)[][] = [];
    for (const w of weeks) {
      for (const L of LINES) {
        const v = w[L.key] as TaxLine;
        body.push([w.weekStart, w.weekEnd, L.label, v.supply, v.vat, v.total]);
      }
      body.push([w.weekStart, w.weekEnd, "합계", w.sum.supply, w.sum.vat, w.sum.total]);
    }
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "매출_세금계산서.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!week) {
    return (
      <div>
        <SettlementHeader title="매출" />
        <div className="grid place-items-center rounded-[12px] border border-jb-line bg-jb-card py-16 text-center">
          <Receipt size={28} className="mb-3 text-jb-ink-mute/60" />
          <div className="text-[14px] font-semibold text-jb-ink-soft">매출 데이터가 아직 없습니다</div>
          <div className="mt-1 text-[12.5px] text-jb-ink-mute">주간 정산서가 반영되면 세금계산서 매출이 집계됩니다.</div>
        </div>
      </div>
    );
  }

  const delta = prev ? week.sum.supply - prev.sum.supply : null;

  return (
    <div>
      <SettlementHeader
        title="매출"
        subtitle="주정산서 세금계산서 내역(역발행) 기준 — 배달료·라이더수수료·관리비·페이백. 공급가액은 VAT 별도입니다."
        actions={
          <>
            <button type="button" disabled={idx >= weeks.length - 1} onClick={() => setIdx((i) => Math.min(weeks.length - 1, i + 1))}
              className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35" aria-label="이전 주">
              <ChevronLeft size={17} />
            </button>
            <div className="min-w-[176px] rounded-[10px] border border-jb-line px-3 py-2 text-center text-[13.5px] font-semibold tabular-nums text-jb-ink">
              {week.weekStart} ~ {week.weekEnd}
            </div>
            <button type="button" disabled={idx <= 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}
              className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35" aria-label="다음 주">
              <ChevronRight size={17} />
            </button>
          </>
        }
      />

      {/* 매출 히어로(공급가액 합계) */}
      <div className="mb-3 rounded-[14px] border border-jb-line bg-jb-card px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-jb-ink-soft"><Receipt size={15} className="text-jb-indigo" /> 매출 (세금계산서 공급가액 합계)</span>
          {delta != null ? (
            <span className={"text-[12.5px] font-semibold tabular-nums " + (delta >= 0 ? "text-jb-green" : "text-jb-red")}>
              전주 대비 {delta >= 0 ? "+" : "−"}{won(Math.abs(delta))}원
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[34px] font-black leading-none tabular-nums tracking-[-0.02em] text-jb-ink">{won(week.sum.supply)}</span>
          <span className="pb-1 text-[15px] font-bold text-jb-ink-soft">원</span>
          <span className="pb-1.5 text-[12px] text-jb-ink-mute">부가세 {won(week.sum.vat)} · 공급대가 {won(week.sum.total)}원</span>
        </div>
      </div>

      {/* 세금계산서 내역 라인별 표 */}
      <div className="mb-3 overflow-hidden rounded-[12px] border border-jb-line bg-jb-card">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-jb-line bg-jb-surface text-[12px] text-jb-ink-mute">
              <th className="px-4 py-2.5 text-left font-medium">구분</th>
              <th className="px-4 py-2.5 text-right font-medium">공급가액</th>
              <th className="px-4 py-2.5 text-right font-medium">부가세액</th>
              <th className="px-4 py-2.5 text-right font-medium">공급대가</th>
            </tr>
          </thead>
          <tbody>
            {LINES.map((L) => {
              const v = week[L.key] as TaxLine;
              return (
                <tr key={L.key} className="border-b border-jb-line/60">
                  <td className="px-4 py-2.5 font-semibold text-jb-ink">{L.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink">{won(v.supply)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink-soft">{won(v.vat)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink-soft">{won(v.total)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-jb-line bg-jb-surface font-bold text-jb-ink">
              <td className="px-4 py-2.5">합계</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-jb-indigo">{won(week.sum.supply)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{won(week.sum.vat)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{won(week.sum.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 주차별 매출(공급가액) 추이 */}
      <div className="rounded-[12px] border border-jb-line bg-jb-card">
        <div className="flex items-center justify-between border-b border-jb-line px-4 py-3">
          <span className="text-[14px] font-semibold text-jb-ink">주차별 매출 추이 (공급가액)</span>
          <button type="button" onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-[10px] border border-jb-line px-2.5 py-1.5 text-[12px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface">
            <Download size={14} /> CSV
          </button>
        </div>
        <div className="divide-y divide-jb-line/60">
          {weeks.map((w, i) => (
            <button type="button" key={w.weekStart} onClick={() => setIdx(i)}
              className={"flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-jb-surface/70 " + (i === idx ? "bg-jb-indigo-tint/40" : "")}>
              <span className="w-[132px] shrink-0 text-[12.5px] font-medium tabular-nums text-jb-ink-soft">{w.weekStart.slice(5)} ~ {w.weekEnd.slice(5)}</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-jb-surface">
                <span className="absolute inset-y-0 left-0 rounded-full bg-jb-indigo" style={{ width: `${(w.sum.supply / maxSum) * 100}%` }} />
              </span>
              <span className="w-[104px] shrink-0 text-right text-[13px] font-bold tabular-nums text-jb-ink">{won(w.sum.supply)}원</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
