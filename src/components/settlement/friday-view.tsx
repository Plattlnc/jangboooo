"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import type { FridayData, FridayWeek } from "@/app/settlement/_lib/friday";
import { SettlementHeader } from "./settlement-header";
import { TerminatedBadge } from "./terminated-badge";

// 금요일 정산 합계 — 4개 항목(본사미션·추가지급·자사프로모션 지급 / 시간제보험료 차감) 라이더별 합산.
const won = (n: number) => n.toLocaleString("ko-KR");

export function FridayView({ data, terminated }: { data: FridayData; terminated?: string[] }) {
  const router = useRouter();
  const { weekStart, weekEnd, rows, weeks, totals } = data;
  const termSet = useMemo(() => new Set(terminated ?? []), [terminated]);
  const [q, setQ] = useState("");

  const idx = weeks.findIndex((w) => w.start === weekStart);
  const newer = idx > 0 ? weeks[idx - 1] : null;
  const older = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : null;
  const go = (w: FridayWeek | null) => w && router.push(`/settlement/friday?week=${w.start}`);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle));
  }, [rows, q]);
  const vT = useMemo(
    () => view.reduce((t, r) => ({ mission: t.mission + r.mission, extra: t.extra + r.extra, promo: t.promo + r.promo, insurance: t.insurance + r.insurance, net: t.net + r.net }), { mission: 0, extra: 0, promo: 0, insurance: 0, net: 0 }),
    [view],
  );

  function exportCsv() {
    const head = ["순번", "라이더", "라이더ID", "본사미션", "추가지급", "자사프로모션", "차감(시간제보험료)", "합계(세전)"];
    const body = view.map((r, i) => [i + 1, r.name, r.riderId, r.mission, r.extra, r.promo, r.insurance, r.net]);
    const foot = ["합계", "", "", vT.mission, vT.extra, vT.promo, vT.insurance, vT.net];
    const csv = [head, ...body, foot].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `금요일정산합계_${weekStart}_${weekEnd}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <SettlementHeader
        title="정산 합계"
        subtitle="금요일에 정산되는 4개 항목(본사 미션·추가 지급·자사 프로모션 − 시간제보험료 차감)을 라이더별로 합산. 세전 기준."
        actions={
          <>
            <button type="button" disabled={!older} onClick={() => go(older)} className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35" aria-label="이전 주"><ChevronLeft size={17} /></button>
            <div className="min-w-[176px] rounded-[10px] border border-jb-line px-3 py-2 text-center text-[13.5px] font-semibold tabular-nums text-jb-ink">{weekStart} ~ {weekEnd}</div>
            <button type="button" disabled={!newer} onClick={() => go(newer)} className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35" aria-label="다음 주"><ChevronRight size={17} /></button>
          </>
        }
      />

      {/* 요약 히어로 */}
      <div className="mb-3 rounded-[14px] border border-jb-line bg-jb-card px-5 py-5">
        <div className="text-[13px] font-semibold text-jb-ink-soft">금요일 정산 합계 (세전)</div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[32px] font-black leading-none tabular-nums tracking-[-0.02em] text-jb-ink">{won(totals.net)}</span>
          <span className="pb-1 text-[15px] font-bold text-jb-ink-soft">원</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cell label="본사 미션" value={totals.mission} sign="+" />
          <Cell label="추가 지급" value={totals.extra} sign="+" />
          <Cell label="자사 프로모션" value={totals.promo} sign="+" />
          <Cell label="시간제보험료" value={totals.insurance} sign="−" minus />
        </div>
      </div>

      {/* 검색 + CSV */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="relative block w-full max-w-[300px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jb-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="라이더 이름·ID 검색" className="w-full rounded-[10px] border border-jb-line bg-jb-card py-2 pl-9 pr-3 text-[13.5px] text-jb-ink outline-none transition-colors placeholder:text-jb-ink-mute focus:border-jb-indigo" />
        </label>
        <button type="button" onClick={exportCsv} disabled={view.length === 0} className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-jb-line px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-40"><Download size={15} /> CSV</button>
      </div>

      {/* 라이더별 합산 표 */}
      {view.length === 0 ? (
        <div className="grid place-items-center rounded-[12px] border border-jb-line bg-jb-card py-16 text-center text-[13px] text-jb-ink-mute">이 주차에 정산된 항목이 없습니다.</div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card">
          <table className="w-full whitespace-nowrap text-[13px]">
            <thead>
              <tr className="border-b border-jb-line bg-jb-surface text-[12px] text-jb-ink-mute">
                <th className="px-3 py-2.5 text-right font-medium">#</th>
                <th className="px-3 py-2.5 text-left font-medium">라이더</th>
                <th className="px-3 py-2.5 text-right font-medium">본사 미션</th>
                <th className="px-3 py-2.5 text-right font-medium">추가 지급</th>
                <th className="px-3 py-2.5 text-right font-medium">자사 프로모션</th>
                <th className="px-3 py-2.5 text-right font-medium">차감(보험료)</th>
                <th className="px-3 py-2.5 text-right font-medium">합계(세전)</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={r.riderId} className="border-b border-jb-line/60">
                  <td className="px-3 py-2.5 text-right tabular-nums text-jb-ink-mute">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-jb-ink">{r.name}{termSet.has(r.riderId) ? <TerminatedBadge /> : null}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-jb-ink-soft">{r.mission ? won(r.mission) : "-"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-jb-ink-soft">{r.extra ? won(r.extra) : "-"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-jb-ink-soft">{r.promo ? won(r.promo) : "-"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-jb-red">{r.insurance ? `−${won(r.insurance)}` : "-"}</td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-jb-indigo">{won(r.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-jb-line bg-jb-surface font-bold text-jb-ink">
                <td className="px-3 py-2.5 text-right" colSpan={2}>합계 · {won(view.length)}명</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{won(vT.mission)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{won(vT.extra)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{won(vT.promo)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-jb-red">−{won(vT.insurance)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-jb-indigo">{won(vT.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11.5px] text-jb-ink-mute">※ 세전 기준 합산입니다. 실지급액은 각 항목의 원천세·고용산재 공제 후 금액이며, 항목별 상세는 해당 탭에서 확인하세요.</p>
    </div>
  );
}

function Cell({ label, value, sign, minus }: { label: string; value: number; sign: string; minus?: boolean }) {
  return (
    <div className="rounded-[10px] border border-jb-line bg-jb-surface/50 px-3 py-2.5">
      <div className="text-[11.5px] text-jb-ink-mute">{label}</div>
      <div className={`mt-0.5 text-[15px] font-black tabular-nums ${minus ? "text-jb-red" : "text-jb-ink"}`}>{sign}{value.toLocaleString("ko-KR")}</div>
    </div>
  );
}
