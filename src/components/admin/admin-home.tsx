"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminDashboardData } from "@/lib/supabase/admin-queries";
import type { SlaPeriod } from "@/types/database";
import { acceptBand, fmtCapturedAt, fmtCount, fmtPct, fmtRangeLabel } from "./format";

// 관리자 홈 — 일간/주간/월간 토글 + 전체 SLA 요약/운행 상태/피크/주의·상위 라이더/일별 추이.
// 산식·분리 규약은 라이더 홈과 동일(수락률=푸드식, 타일=일반+B마트 서브라인).

const PERIODS = [
  { key: "today", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
] as const;

const STATUS_META = [
  { key: "completed", bmartKey: "complete", label: "완료", color: "#1E9E5A", tint: "#e7f5ee" },
  { key: "rejected", bmartKey: "reject", label: "거절", color: "#D9342B", tint: "#fbe9e8" },
  { key: "dispatchCanceled", bmartKey: "cancel", label: "배차취소", color: "#E8590C", tint: "#fdf0e6" },
  { key: "deliveryCanceled", bmartKey: "riderFault", label: "배달취소", color: "#9b9588", tint: "#f4f5f7" },
] as const;

const PEAK_LABELS = [
  { key: "morning", label: "아침점심" },
  { key: "afternoon", label: "오후" },
  { key: "evening", label: "저녁" },
  { key: "midnight", label: "심야" },
] as const;

export function AdminHome({ data }: { data: AdminDashboardData }) {
  const [period, setPeriod] = useState<SlaPeriod>("today");
  const router = useRouter();

  // 스크래퍼 1분 주기에 맞춘 60s 폴링(라이더 홈과 동일 — 탭 숨김 시 중단).
  useEffect(() => {
    const REFRESH_MS = 60_000;
    let id: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (id == null) id = setInterval(() => router.refresh(), REFRESH_MS);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    const onVis = () => (document.visibilityState === "visible" ? start() : stop());
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [router]);

  const view = data[period];
  const t = view.totals;

  const v = useMemo(() => {
    // breakdown 전무한 과거 구간(0004 이전)은 B마트 분리 표시 불가 → 서브라인 생략.
    const catSum =
      t.food.complete + t.food.reject + t.food.cancel + t.food.riderFault +
      t.bmart.complete + t.bmart.reject + t.bmart.cancel + t.bmart.riderFault;
    const hasBreakdown = catSum > 0 || t.completed === 0;
    const band = acceptBand(t.acceptanceRate);

    const status = STATUS_META.map((meta) => {
      const total = t[meta.key];
      const bmart = t.bmart[meta.bmartKey];
      return {
        label: meta.label,
        value: hasBreakdown ? Math.max(0, total - bmart) : total,
        bmart: hasBreakdown ? bmart : null,
        color: total > 0 ? meta.color : "#b9bdc7",
        tileBg: total > 0 ? meta.tint : "#f5f6f8",
      };
    });

    const peakMax = Math.max(...PEAK_LABELS.map((p) => t.peaks[p.key]));
    const peaks = PEAK_LABELS.map((p) => {
      const value = t.peaks[p.key];
      const isMax = value === peakMax && peakMax > 0;
      return { label: p.label, value, isMax };
    });

    const nameOf = (id: string) => data.riderInfo[id]?.name ?? id;
    // 주의 라이더: 수락률 낮은 순(산정 가능한 라이더만).
    const atRisk = view.riders
      .filter((r) => r.acceptanceRate != null && r.assigned > 0)
      .sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0))
      .slice(0, 5)
      .map((r) => ({ id: r.adminRiderId, name: nameOf(r.adminRiderId), rate: r.acceptanceRate, band: acceptBand(r.acceptanceRate) }));
    // 완료 상위: aggregateByRider 기본 정렬(completed desc).
    const top = view.riders.slice(0, 5).map((r) => ({
      id: r.adminRiderId,
      name: nameOf(r.adminRiderId),
      completed: r.completed,
      bmart: r.bmart.complete,
      rate: r.acceptanceRate,
    }));

    // 일별 추이(주간/월간): 최신순 최대 7일.
    const daily = [...view.daily].reverse().slice(0, 7).map((d) => ({
      date: d.date,
      completed: d.completed,
      rejected: d.rejected,
      rate: d.acceptanceRate,
      band: acceptBand(d.acceptanceRate),
    }));

    return { hasBreakdown, band, status, peaks, atRisk, top, daily };
  }, [t, view, data.riderInfo]);

  return (
    <div className="px-3.5 py-[9px]">
      {/* 기간 토글 */}
      <div className="flex gap-1 bg-jb-tab-bg p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={
              "flex-1 py-[9px] text-[13.5px] transition-all " +
              (period === p.key
                ? "bg-white font-black text-jb-ink shadow-[0_1px_3px_rgba(20,23,46,0.1)]"
                : "bg-transparent font-bold text-jb-ink-mute")
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 통합 요약 히어로 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">통합 운행 요약</span>
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">
            {fmtRangeLabel(period, view.range)}
          </span>
        </div>
        <div className="border border-jb-line bg-white px-4 py-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-jb-ink-soft">배달</span>
              <span className="tnum text-[18px] font-black text-jb-ink">{fmtCount(t.completed)}</span>
              <span className="text-[18px] font-bold text-jb-ink-soft">건</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-baseline gap-1">
                <span className="text-[18px] font-bold text-jb-ink-soft">수락률</span>
                <span className="tnum text-[18px] font-black" style={{ color: v.band.color }}>
                  {fmtPct(t.acceptanceRate)}
                </span>
              </span>
              <span
                className="px-2.5 py-[3px] text-[10.5px] font-black text-white"
                style={{ background: v.band.color }}
              >
                {v.band.label}
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-jb-line-soft pt-2 text-[11.5px] font-bold text-jb-ink-soft">
            {v.hasBreakdown ? (
              <span className="tnum">
                일반 {fmtCount(Math.max(0, t.completed - t.bmart.complete))} · B마트 {fmtCount(t.bmart.complete)}
              </span>
            ) : null}
            <span className="tnum">
              활동 라이더 {fmtCount(t.activeRiders)}
              <span className="text-jb-ink-mute"> / 등록 {fmtCount(data.registeredRiders)}</span>
            </span>
            <span className="tnum ml-auto text-jb-ink-mute">{fmtCapturedAt(t.lastCapturedAt)}</span>
          </div>
        </div>
      </div>

      {/* 운행 상태 4타일 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">운행 상태</span>
          {v.hasBreakdown ? (
            <span className="text-[11px] font-bold text-jb-ink-mute">일반 배달 기준 · B마트 별도</span>
          ) : null}
        </div>
        <div className="border border-jb-line bg-white p-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.status.map((it) => (
              <div key={it.label} className="px-1 py-[7px] text-center" style={{ background: it.tileBg }}>
                <div className="text-[11.5px] font-bold text-jb-ink-soft">{it.label}</div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: it.color }}>
                  {fmtCount(it.value)}
                </div>
                {it.bmart != null ? (
                  <div className={"tnum text-[10px] font-bold " + (it.bmart > 0 ? "text-jb-ink-soft" : "text-jb-ink-mute")}>
                    B마트 {fmtCount(it.bmart)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 피크 분포 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">시간대별 분포</span>
          <span className="text-[11px] font-bold text-jb-indigo">최다 시간대 강조</span>
        </div>
        <div className="border border-jb-line bg-white p-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.peaks.map((p) => (
              <div
                key={p.label}
                className="px-1 py-[7px] text-center"
                style={{
                  background: p.isMax ? "#eef1fe" : "#f8f9fb",
                  border: p.isMax ? "1px solid #c7d2fe" : "1px solid transparent",
                }}
              >
                <div className="text-[11.5px] font-bold" style={{ color: p.isMax ? "#4F6AF5" : "#9b9588" }}>
                  {p.label}
                </div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: p.isMax ? "#4F6AF5" : "#1a1d2e" }}>
                  {fmtCount(p.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 수락률 주의 라이더 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">수락률 주의 라이더</span>
          <Link href="/admin/metrics" className="text-[11px] font-bold text-jb-indigo">
            전체 보기
          </Link>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          {v.atRisk.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] font-bold text-jb-ink-mute">
              집계된 실적이 없어요
            </div>
          ) : (
            v.atRisk.map((r, i) => (
              <Link
                key={r.id}
                href={`/admin/riders/${encodeURIComponent(r.id)}`}
                className={
                  "flex items-center gap-2.5 px-3.5 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")
                }
              >
                <span className="tnum w-4 shrink-0 text-[12px] font-black text-jb-ink-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                  {r.name}
                  <span className="tnum ml-1.5 text-[10.5px] font-semibold text-jb-ink-mute">{r.id}</span>
                </span>
                <span className="tnum text-[13.5px] font-black" style={{ color: r.band.color }}>
                  {fmtPct(r.rate)}
                </span>
                <span
                  className="px-1.5 py-0.5 text-[9.5px] font-black text-white"
                  style={{ background: r.band.color }}
                >
                  {r.band.label}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 완료 상위 라이더 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">완료 상위 라이더</span>
          <Link href="/admin/riders" className="text-[11px] font-bold text-jb-indigo">
            전체 보기
          </Link>
        </div>
        <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          {v.top.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] font-bold text-jb-ink-mute">
              집계된 실적이 없어요
            </div>
          ) : (
            v.top.map((r, i) => (
              <Link
                key={r.id}
                href={`/admin/riders/${encodeURIComponent(r.id)}`}
                className={
                  "flex items-center gap-2.5 px-3.5 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")
                }
              >
                <span className="tnum w-4 shrink-0 text-[12px] font-black text-jb-indigo">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                  {r.name}
                  <span className="tnum ml-1.5 text-[10.5px] font-semibold text-jb-ink-mute">{r.id}</span>
                </span>
                {v.hasBreakdown && r.bmart > 0 ? (
                  <span className="tnum text-[10.5px] font-bold text-jb-ink-mute">B마트 {fmtCount(r.bmart)}</span>
                ) : null}
                <span className="tnum text-[13.5px] font-black text-jb-ink">{fmtCount(r.completed)}건</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 일별 추이 (주간/월간) */}
      {period !== "today" && v.daily.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1.5 px-0.5">
            <span className="text-xs font-black text-jb-ink">일별 추이</span>
            <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">최근 {v.daily.length}일</span>
          </div>
          <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
              <span>날짜</span>
              <span className="text-right">완료</span>
              <span className="text-right">거절</span>
              <span className="text-right">수락률</span>
            </div>
            {v.daily.map((d) => (
              <div
                key={d.date}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-2 last:border-b-0"
              >
                <span className="tnum text-[12.5px] font-bold text-jb-ink">{d.date.slice(5).replace("-", ".")}</span>
                <span className="tnum text-right text-[12.5px] font-black text-jb-ink">{fmtCount(d.completed)}</span>
                <span className="tnum text-right text-[12.5px] font-bold text-jb-ink-soft">{fmtCount(d.rejected)}</span>
                <span className="tnum text-right text-[12.5px] font-black" style={{ color: d.band.color }}>
                  {fmtPct(d.rate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        수락률은 배민 공식 산식(푸드 기준)이며 B마트 건은 포함되지 않습니다.
      </div>
    </div>
  );
}
