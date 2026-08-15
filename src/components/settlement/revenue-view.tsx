"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Package, Target, Download } from "lucide-react";
import type { RevenueData, RevenueWeek } from "@/app/settlement/_lib/revenue";
import { cn } from "@/lib/cn";

// 매출 뷰 — 회사 메인 수입인 관리비(관리수수료). 주차 선택 + 관리비 총액/기본·보너스 분해 +
// 세트 목표·달성 지표(발주/유효처리/슬롯/수락률) + 주차별 추이. VAT 별도 기준.

const won = (n: number) => n.toLocaleString("ko-KR");
const wonWithVat = (n: number) => Math.round(n * 1.1).toLocaleString("ko-KR");

function pct(n: number | null): string {
  return n == null ? "—" : `${n}%`;
}

export function RevenueView({ data }: { data: RevenueData }) {
  const { weeks } = data;
  const [idx, setIdx] = useState(0); // 0 = 최신 주차

  const week = weeks[idx] as RevenueWeek | undefined;
  const prev = weeks[idx + 1]; // 직전 주(추이 델타용)

  // 추이 미니 바 차트용 최대값
  const maxFee = useMemo(() => Math.max(1, ...weeks.map((w) => w.mgmtFeeTotal)), [weeks]);

  function exportCsv() {
    const head = [
      "주 시작", "주 끝", "관리비 합계(VAT별도)", "기본 관리비", "보너스 관리비", "기타", "정산수수료 페이백",
      "신청 세트수", "세트당 발주량", "전체 발주물량", "유효 처리물량", "하위3슬롯 달성률(%)",
      "전체 슬롯", "달성 슬롯", "미달성 슬롯", "수락률(%)",
    ];
    const body = weeks.map((w) => [
      w.weekStart, w.weekEnd, w.mgmtFeeTotal, w.baseFee, w.bonusFee, w.etcFee, w.paybackTotal,
      w.setCount ?? "", w.perSetVolume ?? "", w.totalOrderVolume ?? "", w.effectiveVolume ?? "", w.low3Achievement ?? "",
      w.totalSlots ?? "", w.achievedSlots ?? "", w.missedSlots ?? "", w.acceptanceRate ?? "",
    ]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `매출_관리비_추이.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!week) {
    return (
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">매출</h1>
        <div className="mt-4 grid place-items-center rounded-[12px] border border-jb-line bg-jb-card py-16 text-center">
          <TrendingUp size={28} className="mb-3 text-jb-ink-mute/60" />
          <div className="text-[14px] font-semibold text-jb-ink-soft">매출 데이터가 아직 없습니다</div>
          <div className="mt-1 text-[12.5px] text-jb-ink-mute">주간 정산서가 반영되면 관리비 수입이 집계됩니다.</div>
        </div>
      </div>
    );
  }

  const delta = prev ? week.mgmtFeeTotal - prev.mgmtFeeTotal : null;

  return (
    <div>
      {/* 헤더 + 주 이동 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black tracking-[-0.02em] text-jb-ink">매출</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            회사 메인 수입 — 관리수수료(세트 목표 달성 기반). 금액은 VAT 별도 기준입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={idx >= weeks.length - 1}
            onClick={() => setIdx((i) => Math.min(weeks.length - 1, i + 1))}
            className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35"
            aria-label="이전 주"
          >
            <ChevronLeft size={17} />
          </button>
          <div className="min-w-[176px] rounded-[10px] border border-jb-line px-3 py-2 text-center text-[13.5px] font-semibold tabular-nums text-jb-ink">
            {week.weekStart} ~ {week.weekEnd}
          </div>
          <button
            type="button"
            disabled={idx <= 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            className="grid size-9 place-items-center rounded-[10px] border border-jb-line text-jb-ink-soft transition-colors hover:bg-jb-surface disabled:opacity-35"
            aria-label="다음 주"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* 관리비 히어로 */}
      <div className="mb-3 rounded-[14px] border border-jb-line bg-jb-card px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-jb-ink-soft">관리비 (관리수수료)</span>
          {delta != null ? (
            <span className={cn("text-[12.5px] font-semibold tabular-nums", delta >= 0 ? "text-jb-green" : "text-jb-red")}>
              전주 대비 {delta >= 0 ? "+" : "−"}{won(Math.abs(delta))}원
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex items-end gap-2">
          <span className="text-[34px] font-black leading-none tabular-nums tracking-[-0.02em] text-jb-ink">
            {won(week.mgmtFeeTotal)}
          </span>
          <span className="pb-1 text-[15px] font-bold text-jb-ink-soft">원</span>
          <span className="pb-1.5 text-[12px] text-jb-ink-mute">VAT 포함 {wonWithVat(week.mgmtFeeTotal)}원</span>
        </div>
        {/* 기본/보너스 분해 바 */}
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-jb-surface">
          <div className="bg-jb-indigo" style={{ width: `${(week.baseFee / Math.max(1, week.mgmtFeeTotal)) * 100}%` }} />
          <div className="bg-jb-green" style={{ width: `${(week.bonusFee / Math.max(1, week.mgmtFeeTotal)) * 100}%` }} />
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-3 text-[12.5px]">
          <div>
            <span className="inline-flex items-center gap-1.5 text-jb-ink-mute">
              <span className="size-2 rounded-full bg-jb-indigo" /> 기본 관리비
            </span>
            <div className="mt-0.5 font-bold tabular-nums text-jb-ink">{won(week.baseFee)}원</div>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-jb-ink-mute">
              <span className="size-2 rounded-full bg-jb-green" /> 보너스 관리비
            </span>
            <div className="mt-0.5 font-bold tabular-nums text-jb-ink">{won(week.bonusFee)}원</div>
          </div>
          <div>
            <span className="text-jb-ink-mute">기타 · 페이백</span>
            <div className="mt-0.5 font-bold tabular-nums text-jb-ink">{won(week.etcFee + week.paybackTotal)}원</div>
          </div>
        </div>
      </div>

      {/* 세트 목표·달성 지표 */}
      <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={<Package size={15} />} label="신청 세트 · 발주물량"
          value={week.setCount != null ? `${week.setCount}세트` : "—"}
          sub={week.totalOrderVolume != null ? `${won(week.totalOrderVolume)}건 (세트당 ${won(week.perSetVolume ?? 0)})` : undefined} />
        <MetricCard icon={<Target size={15} />} label="유효 처리물량"
          value={week.effectiveVolume != null ? `${won(week.effectiveVolume)}건` : "—"}
          sub={week.low3Achievement != null ? `하위3슬롯 달성률 ${pct(week.low3Achievement)}` : undefined} />
        <MetricCard icon={<Target size={15} />} label="슬롯 달성"
          value={week.achievedSlots != null && week.totalSlots != null ? `${week.achievedSlots} / ${week.totalSlots}` : "—"}
          sub={week.missedSlots != null ? `미달성 ${week.missedSlots}` : undefined} />
        <MetricCard icon={<TrendingUp size={15} />} label="수락률"
          value={pct(week.acceptanceRate)} />
      </div>

      {/* 주차별 추이 */}
      <div className="rounded-[12px] border border-jb-line bg-jb-card">
        <div className="flex items-center justify-between border-b border-jb-line px-4 py-3">
          <span className="text-[14px] font-semibold text-jb-ink">주차별 관리비 추이</span>
          <button type="button" onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-[10px] border border-jb-line px-2.5 py-1.5 text-[12px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface">
            <Download size={14} /> CSV
          </button>
        </div>
        <div className="divide-y divide-jb-line/60">
          {weeks.map((w, i) => (
            <button
              type="button"
              key={w.weekStart}
              onClick={() => setIdx(i)}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-jb-surface/70",
                i === idx && "bg-jb-indigo-tint/40",
              )}
            >
              <span className="w-[132px] shrink-0 text-[12.5px] font-medium tabular-nums text-jb-ink-soft">
                {w.weekStart.slice(5)} ~ {w.weekEnd.slice(5)}
              </span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-jb-surface">
                <span className="absolute inset-y-0 left-0 rounded-full bg-jb-indigo" style={{ width: `${(w.mgmtFeeTotal / maxFee) * 100}%` }} />
              </span>
              <span className="w-[104px] shrink-0 text-right text-[13px] font-bold tabular-nums text-jb-ink">{won(w.mgmtFeeTotal)}원</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[12px] border border-jb-line bg-jb-card px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-jb-ink-mute">
        <span className="text-jb-ink-mute">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-[18px] font-black tabular-nums tracking-[-0.01em] text-jb-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-jb-ink-mute">{sub}</div> : null}
    </div>
  );
}
