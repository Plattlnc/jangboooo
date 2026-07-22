"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminHomeVM } from "./home-vm";
import { DateRangeForm } from "./date-range-form";

// 관리자 홈 — 일간/주간/월간 + 날짜 직접 선택(최대 7일, 당일 제외) 토글.
// 뷰모델은 서버 프리컴퓨트(home-vm) — 여기는 표시/탭 전환/60s 폴링만 담당.

const PERIODS = [
  { key: "today", label: "일간" },
  { key: "week", label: "주간" },
  { key: "month", label: "월간" },
] as const;

type Tab = (typeof PERIODS)[number]["key"] | "custom";

export function AdminHome({
  today,
  week,
  month,
  custom,
  customRange,
  maxDate,
}: {
  today: AdminHomeVM;
  week: AdminHomeVM;
  month: AdminHomeVM;
  /** from/to 쿼리로 선택된 커스텀 기간 뷰모델(클램프 완료). 없으면 null. */
  custom: AdminHomeVM | null;
  customRange: { from: string; to: string } | null;
  /** 날짜 입력 상한(어제 영업일) — 당일은 실시간 수집 중이라 제외. */
  maxDate: string;
}) {
  const [tab, setTab] = useState<Tab>(custom ? "custom" : "today");
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

  const v = tab === "custom" && custom ? custom : tab === "week" ? week : tab === "month" ? month : today;

  return (
    <div className="px-3.5 py-[9px]">
      {/* 기간 토글 */}
      <div className="flex gap-1 bg-jb-tab-bg p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setTab(p.key)}
            className={
              "flex-1 py-[9px] text-[13.5px] transition-all " +
              (tab === p.key
                ? "bg-white font-black text-jb-ink shadow-[0_1px_3px_rgba(20,23,46,0.1)]"
                : "bg-transparent font-bold text-jb-ink-mute")
            }
          >
            {p.label}
          </button>
        ))}
        {custom ? (
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={
              "flex-1 py-[9px] text-[13.5px] transition-all " +
              (tab === "custom"
                ? "bg-white font-black text-jb-indigo shadow-[0_1px_3px_rgba(20,23,46,0.1)]"
                : "bg-transparent font-bold text-jb-ink-mute")
            }
          >
            기간
          </button>
        ) : null}
      </div>

      {/* 날짜 직접 선택 — 조회 시 from/to 쿼리로 서버 재렌더('기간' 탭 활성). */}
      <DateRangeForm
        basePath="/admin"
        from={customRange?.from}
        to={customRange?.to}
        maxDate={maxDate}
        note="최대 7일 조회 · 오늘은 실시간 수집 중이라 선택할 수 없어요"
      />

      {/* 통합 요약 히어로 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">통합 운행 요약</span>
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{v.rangeLabel}</span>
        </div>
        <div className="border border-jb-line bg-white px-4 py-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-jb-ink-soft">배달</span>
              <span className="tnum text-[18px] font-black text-jb-ink">{v.hero.completed}</span>
              <span className="text-[18px] font-bold text-jb-ink-soft">건</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="flex items-baseline gap-1">
                <span className="text-[18px] font-bold text-jb-ink-soft">수락률</span>
                <span className="tnum text-[18px] font-black" style={{ color: v.hero.bandColor }}>
                  {v.hero.accept}
                </span>
              </span>
              <span
                className="px-2.5 py-[3px] text-[10.5px] font-black text-white"
                style={{ background: v.hero.bandColor }}
              >
                {v.hero.bandLabel}
              </span>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-jb-line-soft pt-2 text-[11.5px] font-bold text-jb-ink-soft">
            {v.hero.split ? <span className="tnum">{v.hero.split}</span> : null}
            <span className="tnum">
              활동 라이더 {v.hero.active}
              <span className="text-jb-ink-mute"> / 등록 {v.hero.registered}</span>
            </span>
            <span className="tnum ml-auto text-jb-ink-mute">{v.hero.captured}</span>
          </div>
        </div>
      </div>

      {/* 운행 상태 4타일 */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-xs font-black text-jb-ink">운행 상태</span>
          {v.hasBreakdown ? (
            <span className="text-[11px] font-bold text-jb-ink-mute">일반 배달 기준 · B마트/스토어 별도</span>
          ) : null}
        </div>
        <div className="border border-jb-line bg-white p-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.status.map((it) => (
              <div key={it.label} className="px-1 py-[7px] text-center" style={{ background: it.tileBg }}>
                <div className="text-[11.5px] font-bold text-jb-ink-soft">{it.label}</div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: it.color }}>
                  {it.value}
                </div>
                {it.bmart != null ? (
                  <div
                    className={
                      "tnum text-[10px] font-bold " + (it.bmart !== "0" ? "text-jb-ink-soft" : "text-jb-ink-mute")
                    }
                  >
                    B마트 {it.bmart}
                  </div>
                ) : null}
                {it.store != null ? (
                  <div
                    className={
                      "tnum text-[10px] font-bold " + (it.store !== "0" ? "text-jb-ink-soft" : "text-jb-ink-mute")
                    }
                  >
                    스토어 {it.store}
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
                <div
                  className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]"
                  style={{ color: p.isMax ? "#4F6AF5" : "#1a1d2e" }}
                >
                  {p.value}
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
                <span className="tnum text-[13.5px] font-black" style={{ color: r.bandColor }}>
                  {r.rate}
                </span>
                <span
                  className="px-1.5 py-0.5 text-[9.5px] font-black text-white"
                  style={{ background: r.bandColor }}
                >
                  {r.bandLabel}
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
                {r.bmart ? (
                  <span className="tnum text-[10.5px] font-bold text-jb-ink-mute">B마트 {r.bmart}</span>
                ) : null}
                {r.store ? (
                  <span className="tnum text-[10.5px] font-bold text-jb-ink-mute">스토어 {r.store}</span>
                ) : null}
                <span className="tnum text-[13.5px] font-black text-jb-ink">{r.completed}건</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 일별 추이 (주간/월간/기간) */}
      {tab !== "today" && v.daily.length > 0 ? (
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
                <span className="tnum text-[12.5px] font-bold text-jb-ink">{d.date}</span>
                <span className="tnum text-right text-[12.5px] font-black text-jb-ink">{d.completed}</span>
                <span className="tnum text-right text-[12.5px] font-bold text-jb-ink-soft">{d.rejected}</span>
                <span className="tnum text-right text-[12.5px] font-black" style={{ color: d.rateColor }}>
                  {d.rate}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        수락률은 배민 공식 산식(푸드 기준)이며 B마트·스토어 건은 포함되지 않습니다.
      </div>
    </div>
  );
}
