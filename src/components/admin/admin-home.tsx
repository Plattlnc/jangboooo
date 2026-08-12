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

interface PeriodOption {
  value: string;
  label: string;
}

interface CenterGoalVM {
  key: string;
  label: string;
  current: number | null;
  goal: number | null;
  pct: number | null;
}

export function AdminHome({
  today,
  week,
  month,
  custom,
  customRange,
  maxDate,
  weekOptions,
  monthOptions,
  selectedWeek,
  selectedMonth,
  initialTab,
  centerGoals,
}: {
  today: AdminHomeVM;
  week: AdminHomeVM;
  month: AdminHomeVM;
  /** from/to 쿼리로 선택된 커스텀 기간 뷰모델(클램프 완료). 없으면 null. */
  custom: AdminHomeVM | null;
  customRange: { from: string; to: string } | null;
  /** 날짜 입력 상한(어제 영업일) — 당일은 실시간 수집 중이라 제외. */
  maxDate: string;
  /** 주(수~화) 선택 옵션 — 최신이 먼저(value=수요일 날짜). */
  weekOptions: PeriodOption[];
  /** 월(달력월) 선택 옵션 — 최신이 먼저(value='YYYY-MM'). */
  monthOptions: PeriodOption[];
  selectedWeek: string;
  selectedMonth: string;
  initialTab: Tab;
  /** 오늘(영업일) 공동목표 4피크 — 실시간. 미수집 시 값 null. */
  centerGoals: CenterGoalVM[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();

  // 주/월 선택 → URL 갱신(서버 재조회) + 해당 탭 활성. 상대 선택은 유지.
  const pickWeek = (v: string) => {
    setTab("week");
    router.push(`/admin?tab=week&wk=${v}&mo=${selectedMonth}`);
  };
  const pickMonth = (v: string) => {
    setTab("month");
    router.push(`/admin?tab=month&mo=${v}&wk=${selectedWeek}`);
  };

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
    <div className="px-3.5 py-3">
      {/* 기간 토글 */}
      <div className="flex gap-1 rounded-[18px] bg-jb-tab-bg p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setTab(p.key)}
            className={
              "flex-1 rounded-[12px] py-[9px] text-[13.5px] transition-all " +
              (tab === p.key
                ? "bg-jb-card font-black text-jb-ink shadow-[var(--toss-shadow)]"
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
              "flex-1 rounded-[12px] py-[9px] text-[13.5px] transition-all " +
              (tab === "custom"
                ? "bg-jb-card font-black text-jb-indigo shadow-[var(--toss-shadow)]"
                : "bg-transparent font-bold text-jb-ink-mute")
            }
          >
            기간
          </button>
        ) : null}
      </div>

      {/* 기간 선택 — 주간/월간: 주(수~화)·월 드롭다운 / 기간: 날짜 직접 선택 / 일간: 없음. */}
      {tab === "week" || tab === "month" ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <PeriodPicker label="주간" value={selectedWeek} options={weekOptions} onChange={pickWeek} active={tab === "week"} />
          <PeriodPicker label="월간" value={selectedMonth} options={monthOptions} onChange={pickMonth} active={tab === "month"} />
        </div>
      ) : tab === "custom" ? (
        <DateRangeForm
          basePath="/admin"
          from={customRange?.from}
          to={customRange?.to}
          maxDate={maxDate}
          note="최대 7일 조회 · 오늘은 실시간 수집 중이라 선택할 수 없어요"
        />
      ) : null}

      {/* 통합 요약 히어로 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">통합 운행 요약</span>
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{v.rangeLabel}</span>
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card px-4 py-3 shadow-[var(--toss-shadow)]">
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
                className="rounded-[8px] px-2.5 py-[3px] text-[10.5px] font-black text-white"
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
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">운행 상태</span>
          {v.hasBreakdown ? (
            <span className="text-[11px] font-bold text-jb-ink-mute">일반 배달 기준 · B마트/스토어 별도</span>
          ) : null}
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card p-3 shadow-[var(--toss-shadow)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.status.map((it) => (
              <div key={it.label} className="rounded-[12px] px-1 py-[7px] text-center" style={{ background: it.tileBg }}>
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
                {it.offHours != null ? (
                  <div
                    className={
                      "tnum text-[10px] font-bold " + (it.offHours !== "0" ? "text-jb-orange" : "text-jb-ink-mute")
                    }
                  >
                    시간 외 {it.offHours}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 피크 분포 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">시간대별 분포</span>
          <span className="text-[11px] font-bold text-jb-indigo">최다 시간대 강조</span>
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card p-3 shadow-[var(--toss-shadow)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.peaks.map((p) => (
              <div
                key={p.label}
                className="rounded-[12px] px-1 py-[7px] text-center"
                style={{
                  background: p.isMax ? "#e8f1fe" : "#f2f4f6",
                  border: p.isMax ? "1px solid #c7d2fe" : "1px solid transparent",
                }}
              >
                <div className="text-[11.5px] font-bold" style={{ color: p.isMax ? "#3182f6" : "#8b95a1" }}>
                  {p.label}
                </div>
                <div
                  className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]"
                  style={{ color: p.isMax ? "#3182f6" : "#191f28" }}
                >
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오늘 공동목표(협력사 4피크) — 시간대별 분포 아래. 목표 탭과 동일 소스, 항상 당일 실시간. */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">
            오늘 공동목표 <span className="text-jb-indigo">· 협력사 4피크</span>
          </span>
          <Link href="/admin/goals" className="text-[11px] font-bold text-jb-indigo">
            이력 보기
          </Link>
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card px-[18px] py-4 shadow-[var(--toss-shadow)]">
          {centerGoals.every((g) => g.current == null && g.goal == null) ? (
            <div className="flex flex-col items-center gap-1 py-5 text-center">
              <span className="text-[12.5px] font-bold text-jb-ink-soft">오늘 공동목표가 아직 수집 전이에요</span>
              <span className="text-[11px] text-jb-ink-mute">수집되면 자동으로 표시돼요</span>
            </div>
          ) : (
            centerGoals.map((g) => {
              const over = (g.pct ?? 0) >= 100;
              const remaining = g.goal != null && g.current != null ? g.goal - g.current : null;
              const barColor = over ? "#3182f6" : "#f28a00";
              return (
                <div key={g.key} className="border-t border-jb-line-soft py-[11px] first:border-t-0 first:pt-1 last:pb-1">
                  <span className="text-[14.5px] font-black tracking-[-0.02em] text-jb-ink">{g.label}</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="tnum text-[22px] font-black tracking-[-0.02em]" style={{ color: barColor }}>
                      {g.current == null ? "—" : g.current.toLocaleString()}
                    </span>
                    <span className="tnum text-[13px] font-bold text-jb-ink-mute">
                      / {g.goal == null ? "—" : `${g.goal.toLocaleString()}건`}
                    </span>
                    <span className="tnum text-[12.5px] font-black text-jb-ink-mute">{g.pct == null ? "—" : `${g.pct}%`}</span>
                    {remaining != null && g.pct != null ? (
                      <span
                        className={
                          "tnum ml-auto whitespace-nowrap text-[12px] font-black " +
                          (remaining <= 0 ? "text-jb-green" : "text-jb-indigo")
                        }
                      >
                        {remaining <= 0 ? "목표 달성" : `${remaining.toLocaleString()}건 남음`}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 h-[9px] overflow-hidden rounded-full bg-jb-track">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(g.pct ?? 0, 100)}%`, background: barColor }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 수락률 주의 라이더 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">수락률 주의 라이더</span>
          <Link href="/admin/metrics" className="text-[11px] font-bold text-jb-indigo">
            전체 보기
          </Link>
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
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
                  className="rounded-[8px] px-1.5 py-0.5 text-[9.5px] font-black text-white"
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
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">완료 상위 라이더</span>
          <Link href="/admin/riders" className="text-[11px] font-bold text-jb-indigo">
            전체 보기
          </Link>
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
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
        <div className="mt-3">
          <div className="mb-1.5 px-0.5">
            <span className="text-[15px] font-black text-jb-ink">일별 추이</span>
            <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">최근 {v.daily.length}일</span>
          </div>
          <div className="rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
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

// 주/월 선택 드롭다운 — 라벨 + 네이티브 select. 활성 기간은 인디고 강조.
function PeriodPicker({
  label,
  value,
  options,
  onChange,
  active,
}: {
  label: string;
  value: string;
  options: PeriodOption[];
  onChange: (v: string) => void;
  active: boolean;
}) {
  return (
    <label
      className={
        "flex items-center gap-1.5 rounded-[12px] border px-2.5 py-1.5 " +
        (active ? "border-jb-indigo bg-jb-indigo-tint" : "border-jb-line bg-jb-card")
      }
    >
      <span className={"text-[11.5px] font-bold " + (active ? "text-jb-indigo" : "text-jb-ink-mute")}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label} 기간 선택`}
        className="tnum bg-transparent text-[12.5px] font-bold text-jb-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
