"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminHomeVM } from "./home-vm";

// 관리자 홈 — 상단 오늘/주/월 선택 → 단일 대시보드가 그 기간을 반영.
// 공동목표는 항상 당일 실시간. 60s 폴링.

type ActivePeriod = "today" | "week" | "month";

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

interface WorkingRiderVM {
  id: string;
  name: string | null;
  status: string | null;
}

export function AdminHome({
  view,
  activePeriod,
  weekOptions,
  monthOptions,
  selectedWeek,
  selectedMonth,
  centerGoals,
  working,
  workingRiders,
}: {
  view: AdminHomeVM;
  activePeriod: ActivePeriod;
  weekOptions: PeriodOption[];
  monthOptions: PeriodOption[];
  selectedWeek: string;
  selectedMonth: string;
  centerGoals: CenterGoalVM[];
  working: number | null;
  workingRiders: WorkingRiderVM[];
}) {
  const router = useRouter();
  const [showWorking, setShowWorking] = useState(false);

  // 60s 폴링(스크래퍼 1분 주기 — 탭 숨김 시 중단).
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

  return (
    <div className="px-3.5 py-3">
      {/* 기간 선택 — 오늘 / 주(수~화) / 월 */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2 px-0.5">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className={
            "rounded-[12px] border px-3 py-1.5 text-[12.5px] font-bold transition-colors " +
            (activePeriod === "today"
              ? "border-jb-indigo bg-jb-indigo-tint text-jb-indigo"
              : "border-jb-line bg-jb-card text-jb-ink-mute")
          }
        >
          오늘
        </button>
        <PeriodPicker
          label="주"
          value={selectedWeek}
          options={weekOptions}
          onChange={(v) => router.push(`/admin?wk=${v}`)}
          active={activePeriod === "week"}
        />
        <PeriodPicker
          label="월"
          value={selectedMonth}
          options={monthOptions}
          onChange={(v) => router.push(`/admin?mo=${v}`)}
          active={activePeriod === "month"}
        />
        <span className="ml-auto tnum text-[11px] font-semibold text-jb-ink-mute">{view.rangeLabel}</span>
      </div>

      {/* 통합 운행 요약 히어로 */}
      <div className="rounded-[18px] border border-jb-line bg-jb-card px-4 py-3 shadow-[var(--toss-shadow)]">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-bold text-jb-ink-soft">배달</span>
            <span className="tnum text-[18px] font-black text-jb-ink">{view.hero.completed}</span>
            <span className="text-[18px] font-bold text-jb-ink-soft">건</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-baseline gap-1">
              <span className="text-[18px] font-bold text-jb-ink-soft">수락률</span>
              <span className="tnum text-[18px] font-black" style={{ color: view.hero.bandColor }}>{view.hero.accept}</span>
            </span>
            <span className="rounded-[8px] px-2.5 py-[3px] text-[10.5px] font-black text-white" style={{ background: view.hero.bandColor }}>
              {view.hero.bandLabel}
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-jb-line-soft pt-2 text-[11.5px] font-bold text-jb-ink-soft">
          {view.hero.split ? <span className="tnum">{view.hero.split}</span> : null}
          <span className="tnum">
            활동 라이더 {view.hero.active}
            <span className="text-jb-ink-mute"> / 등록 {view.hero.registered}</span>
          </span>
          <span className="tnum ml-auto text-jb-ink-mute">{view.hero.captured}</span>
        </div>
      </div>

      {/* 운행 상태 4타일 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-black text-jb-ink">운행 상태</span>
          {view.hasBreakdown ? <span className="text-[11px] font-bold text-jb-ink-mute">일반 배달 기준 · B마트/스토어 별도</span> : null}
        </div>
        <div className="rounded-[18px] border border-jb-line bg-jb-card p-3 shadow-[var(--toss-shadow)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {view.status.map((it) => (
              <div key={it.label} className="rounded-[12px] px-1 py-[7px] text-center" style={{ background: it.tileBg }}>
                <div className="text-[11.5px] font-bold text-jb-ink-soft">{it.label}</div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: it.color }}>{it.value}</div>
                {it.bmart != null ? (
                  <div className={"tnum text-[10px] font-bold " + (it.bmart !== "0" ? "text-jb-ink-soft" : "text-jb-ink-mute")}>B마트 {it.bmart}</div>
                ) : null}
                {it.store != null ? (
                  <div className={"tnum text-[10px] font-bold " + (it.store !== "0" ? "text-jb-ink-soft" : "text-jb-ink-mute")}>스토어 {it.store}</div>
                ) : null}
                {it.offHours != null ? (
                  <div className={"tnum text-[10px] font-bold " + (it.offHours !== "0" ? "text-jb-orange" : "text-jb-ink-mute")}>시간 외 {it.offHours}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오늘 공동목표(협력사 4피크) — 항상 당일 실시간 */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between px-0.5">
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-black text-jb-ink">
              오늘 공동목표 <span className="text-jb-indigo">· 협력사 4피크</span>
            </span>
            {working != null ? (
              <button
                type="button"
                onClick={() => setShowWorking(true)}
                className="flex items-baseline gap-1"
                aria-label="현재 출근 라이더 목록 보기"
              >
                <span className="text-[15px] font-bold text-jb-ink-mute">· 출근</span>
                <span className="tnum text-[15px] font-black text-jb-green underline decoration-jb-green/30 underline-offset-[3px]">
                  {working.toLocaleString()}
                </span>
                <span className="text-[15px] font-bold text-jb-ink-mute">명</span>
              </button>
            ) : null}
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
          {view.atRisk.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] font-bold text-jb-ink-mute">집계된 실적이 없어요</div>
          ) : (
            view.atRisk.map((r, i) => (
              <Link
                key={r.id}
                href={`/admin/riders/${encodeURIComponent(r.id)}`}
                className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")}
              >
                <span className="tnum w-4 shrink-0 text-[12px] font-black text-jb-ink-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                  {r.name}
                  <span className="tnum ml-1.5 text-[10.5px] font-semibold text-jb-ink-mute">{r.id}</span>
                </span>
                <span className="tnum text-[13.5px] font-black" style={{ color: r.bandColor }}>{r.rate}</span>
                <span className="rounded-[8px] px-1.5 py-0.5 text-[9.5px] font-black text-white" style={{ background: r.bandColor }}>
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
          {view.top.length === 0 ? (
            <div className="px-4 py-5 text-center text-[12px] font-bold text-jb-ink-mute">집계된 실적이 없어요</div>
          ) : (
            view.top.map((r, i) => (
              <Link
                key={r.id}
                href={`/admin/riders/${encodeURIComponent(r.id)}`}
                className={"flex items-center gap-2.5 px-3.5 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")}
              >
                <span className="tnum w-4 shrink-0 text-[12px] font-black text-jb-indigo">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                  {r.name}
                  <span className="tnum ml-1.5 text-[10.5px] font-semibold text-jb-ink-mute">{r.id}</span>
                </span>
                {r.bmart ? <span className="tnum text-[10.5px] font-bold text-jb-ink-mute">B마트 {r.bmart}</span> : null}
                {r.store ? <span className="tnum text-[10.5px] font-bold text-jb-ink-mute">스토어 {r.store}</span> : null}
                <span className="tnum text-[13.5px] font-black text-jb-ink">{r.completed}건</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* 일별 추이 (주/월 기간에서) */}
      {activePeriod !== "today" && view.daily.length > 0 ? (
        <div className="mt-3">
          <div className="mb-1.5 px-0.5">
            <span className="text-[15px] font-black text-jb-ink">일별 추이</span>
            <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">최근 {view.daily.length}일</span>
          </div>
          <div className="rounded-[18px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
              <span>날짜</span>
              <span className="text-right">완료</span>
              <span className="text-right">거절</span>
              <span className="text-right">수락률</span>
            </div>
            {view.daily.map((d) => (
              <div
                key={d.date}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-2 last:border-b-0"
              >
                <span className="tnum text-[12.5px] font-bold text-jb-ink">{d.date}</span>
                <span className="tnum text-right text-[12.5px] font-black text-jb-ink">{d.completed}</span>
                <span className="tnum text-right text-[12.5px] font-bold text-jb-ink-soft">{d.rejected}</span>
                <span className="tnum text-right text-[12.5px] font-black" style={{ color: d.rateColor }}>{d.rate}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        수락률은 배민 공식 산식(푸드 기준)이며 B마트·스토어 건은 포함되지 않습니다.
      </div>

      {/* 현재 출근 라이더 목록 — 출근 N명 클릭 시 */}
      {showWorking && working != null ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setShowWorking(false)}
        >
          <div
            className="flex max-h-[78vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-jb-card shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-jb-line-soft px-4 py-3">
              <span className="text-[15px] font-black text-jb-ink">
                현재 출근 <span className="tnum text-jb-green">{working.toLocaleString()}</span>명
              </span>
              <button
                type="button"
                onClick={() => setShowWorking(false)}
                className="rounded-[10px] bg-jb-surface px-3 py-1 text-[12.5px] font-bold text-jb-ink-soft"
              >
                닫기
              </button>
            </div>
            <div className="overflow-y-auto">
              {workingRiders.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12.5px] font-bold text-jb-ink-mute">
                  근무 중인 라이더 정보가 없어요
                </div>
              ) : (
                workingRiders.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/admin/riders/${encodeURIComponent(r.id)}`}
                    className={"flex items-center gap-2.5 px-4 py-2.5 " + (i > 0 ? "border-t border-jb-line-soft" : "")}
                  >
                    <span className="tnum w-5 shrink-0 text-[12px] font-black text-jb-ink-mute">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-jb-ink">
                      {r.name ?? r.id}
                      <span className="tnum ml-1.5 text-[10.5px] font-semibold text-jb-ink-mute">{r.id}</span>
                    </span>
                    {r.status ? (
                      <span className="shrink-0 rounded-full bg-jb-green-tint px-2 py-0.5 text-[10px] font-black text-jb-green">
                        {r.status}
                      </span>
                    ) : null}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
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
