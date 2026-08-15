"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown, Download, Search, HandCoins } from "lucide-react";
import type { ExtraPayments } from "@/app/settlement/_lib/extra";
import { cn } from "@/lib/cn";

// 추가 지급 뷰 — 주차(수~화) 선택 + 라이더별 합산 표(행 펼침 시 건별 배달정보·사유).
// 데이터 원천: 바로고 주차별 정산내역서 '추가배달료' 시트. 세전 금액, 공제 미적용
// (실지급 공제는 을지 '추가지급 B' 합산 흐름에서 처리됨 — 여기선 내역 정리 목적).

const won = (n: number) => n.toLocaleString("ko-KR");

/** 배달정보 "20260803_7817LRHQ" → "8/3 · 7817LRHQ" */
function fmtDeliveryInfo(info: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})_(.+)$/.exec(info);
  if (!m) return info || "—";
  return `${Number(m[2])}/${Number(m[3])} · ${m[4]}`;
}

/** 사유 "20260803-20260805_기상할증 보정" → "기상할증 보정 (8/3~8/5 처리)" */
function fmtReason(reason: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{4})(\d{2})(\d{2})_(.+)$/.exec(reason);
  if (!m) return reason || "—";
  return `${m[7]} (${Number(m[2])}/${Number(m[3])}~${Number(m[5])}/${Number(m[6])} 처리)`;
}

export function ExtraPaymentsView({ data }: { data: ExtraPayments }) {
  const router = useRouter();
  const { weekStart, weekEnd, rows, totalKrw, totalCount, availableWeeks } = data;

  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const weekIdx = availableWeeks.findIndex((w) => w.start === weekStart);
  const newer = weekIdx > 0 ? availableWeeks[weekIdx - 1] : null;
  const older = weekIdx >= 0 && weekIdx < availableWeeks.length - 1 ? availableWeeks[weekIdx + 1] : null;

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  function toggle(riderId: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(riderId)) next.delete(riderId);
      else next.add(riderId);
      return next;
    });
  }

  function exportCsv() {
    const head = ["번호", "라이더", "라이더ID", "건수", "합계(세전)", "배달정보", "사유", "금액"];
    const body: (string | number)[][] = [];
    view.forEach((r, i) => {
      r.items.forEach((it, j) => {
        body.push([
          j === 0 ? i + 1 : "", j === 0 ? r.name : "", j === 0 ? r.riderId : "",
          j === 0 ? r.count : "", j === 0 ? r.totalKrw : "",
          it.deliveryInfo, it.reason, it.amountKrw,
        ]);
      });
    });
    const foot = ["합계", "", "", totalCount, totalKrw, "", "", ""];
    const csv = [head, ...body, foot]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `추가지급_${weekStart}_${weekEnd}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      {/* 헤더: 타이틀 + 주 이동 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black tracking-[-0.02em] text-jb-ink">추가 지급</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            주간 정산서의 소급 보정 내역(기상할증 보정 등) — 본사 미션과 별개 항목입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!older}
            onClick={() => older && router.push(`/settlement/extra?week=${older.start}`)}
            className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35"
            aria-label="이전 주"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-[176px] rounded-[10px] border border-jb-line px-3 py-2 text-center text-[13.5px] font-semibold tabular-nums text-jb-ink">
            {weekStart ? `${weekStart} ~ ${weekEnd}` : "데이터 없음"}
          </div>
          <button
            type="button"
            disabled={!newer}
            onClick={() => newer && router.push(`/settlement/extra?week=${newer.start}`)}
            className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35"
            aria-label="다음 주"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* 요약 히어로 */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: "추가 지급 합계 (세전)", value: `${won(totalKrw)}원` },
          { label: "지급 건수", value: `${won(totalCount)}건` },
          { label: "대상 라이더", value: `${won(rows.length)}명` },
        ].map((c) => (
          <div key={c.label} className="rounded-[12px] border border-jb-line bg-jb-card px-4 py-3.5">
            <div className="text-[12px] font-medium text-jb-ink-mute">{c.label}</div>
            <div className="mt-1 text-[19px] font-black tabular-nums tracking-[-0.01em] text-jb-ink">{c.value}</div>
          </div>
        ))}
      </div>

      {/* 검색 + CSV */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="relative block w-full max-w-[300px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jb-ink-mute" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="라이더 이름·ID 검색"
            className="w-full rounded-[10px] border border-jb-line bg-jb-card py-2 pl-9 pr-3 text-[13.5px] text-jb-ink outline-none transition-colors placeholder:text-jb-ink-mute focus:border-jb-indigo"
          />
        </label>
        <button
          type="button"
          onClick={exportCsv}
          disabled={view.length === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-[10px] border border-jb-line px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-40"
        >
          <Download size={15} />
          CSV
        </button>
      </div>

      {/* 표 */}
      {view.length === 0 ? (
        <div className="grid place-items-center rounded-[12px] border border-jb-line bg-jb-card py-16 text-center">
          <HandCoins size={28} className="mb-3 text-jb-ink-mute/60" />
          <div className="text-[14px] font-semibold text-jb-ink-soft">추가 지급 내역이 없습니다</div>
          <div className="mt-1 text-[12.5px] text-jb-ink-mute">
            주간 정산서가 반영되면 여기에 소급 보정 내역이 정리됩니다.
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card">
          <table className="w-full whitespace-nowrap text-[13.5px]">
            <thead>
              <tr className="border-b border-jb-line bg-jb-surface text-left text-[12px] text-jb-ink-mute">
                <th className="px-3 py-2.5 font-medium">번호</th>
                <th className="min-w-[96px] px-4 py-2.5 font-medium">라이더</th>
                <th className="w-full px-4 py-2.5 font-medium">라이더ID</th>
                <th className="px-4 py-2.5 text-right font-medium">건수</th>
                <th className="px-4 py-2.5 text-right font-medium">합계 (세전)</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => {
                const opened = open.has(r.riderId);
                return (
                  <ExtraRow
                    key={r.riderId}
                    idx={i + 1}
                    row={r}
                    opened={opened}
                    onToggle={() => toggle(r.riderId)}
                  />
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-jb-line bg-jb-surface font-semibold text-jb-ink">
                <td className="px-4 py-2.5" colSpan={3}>합계</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{won(totalCount)}건</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{won(totalKrw)}원</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function ExtraRow({
  idx,
  row,
  opened,
  onToggle,
}: {
  idx: number;
  row: ExtraPayments["rows"][number];
  opened: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "cursor-pointer border-b border-jb-line/60 transition-colors hover:bg-jb-surface/70",
          opened && "bg-jb-surface/50",
        )}
      >
        <td className="px-3 py-2.5 tabular-nums text-jb-ink-mute">{idx}</td>
        <td className="px-4 py-2.5 font-semibold text-jb-ink">{row.name}</td>
        <td className="px-4 py-2.5 text-jb-ink-mute">{row.riderId}</td>
        <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink-soft">{row.count}건</td>
        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-jb-ink">{won(row.totalKrw)}원</td>
        <td className="px-2 py-2.5 text-jb-ink-mute">
          <ChevronDown size={15} className={cn("transition-transform", opened && "rotate-180")} />
        </td>
      </tr>
      {opened ? (
        <tr className="border-b border-jb-line/60 bg-jb-surface/40">
          <td colSpan={6} className="px-4 pb-3 pt-1">
            <div className="overflow-hidden rounded-[10px] border border-jb-line/70 bg-jb-card">
              <table className="w-full whitespace-nowrap text-[12.5px]">
                <thead>
                  <tr className="border-b border-jb-line/70 text-left text-[11.5px] text-jb-ink-mute">
                    <th className="px-3 py-2 font-medium">대상 배달</th>
                    <th className="w-full px-3 py-2 font-medium">사유</th>
                    <th className="px-3 py-2 text-right font-medium">금액</th>
                  </tr>
                </thead>
                <tbody>
                  {row.items.map((it, j) => (
                    <tr key={j} className="border-b border-jb-line/40 last:border-b-0">
                      <td className="px-3 py-1.5 tabular-nums text-jb-ink-soft">{fmtDeliveryInfo(it.deliveryInfo)}</td>
                      <td className="px-3 py-1.5 text-jb-ink-soft">{fmtReason(it.reason)}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-jb-ink">
                        {won(it.amountKrw)}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
