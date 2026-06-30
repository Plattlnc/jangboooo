"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeMetrics } from "@/lib/mock/home";
import type { HomeProfile } from "./home-view";
import { GoalIconArt } from "./goal-icon-art";

// 시안 홈(SLA 대시보드) — 오늘/주간 탭 전환. 파생값은 시안 renderVals 로직 그대로.
// 디자인(2026-06-29): 모든 코너 라운드 제거(각진 정렬형) — 홈 격리 변경(전역 토큰/타 화면 불변).
//   구간별 달성률에 "N건 남음"(목표−실적) 표기 추가. 폰트는 전역 토큰 그대로(Pretendard/Tossface).

const STATUS_TINT: Record<string, string> = {
  "#1E9E5A": "#e7f5ee",
  "#D9342B": "#fbe9e8",
  "#E8590C": "#fdf0e6",
  "#9b9588": "#f4f5f7",
};

function useHomeView(m: HomeMetrics) {
  return useMemo(() => {
    const acceptStatus =
      m.accept >= 85
        ? { label: "양호", color: "#1E9E5A" }
        : m.accept >= 70
          ? { label: "주의", color: "#E8590C" }
          : { label: "위험", color: "#D9342B" };
    const acceptOnDark =
      acceptStatus.label === "양호" ? "#4ade80" : acceptStatus.label === "주의" ? "#fbbf24" : "#ff7a7a";

    const statusItems = m.status.map((it) => ({
      ...it,
      tileBg: it.value > 0 ? (STATUS_TINT[it.color] ?? "#f8f9fb") : "#f5f6f8",
      numColor: it.value > 0 ? it.color : "#b9bdc7",
    }));
    const totalAll = m.status.reduce((a, b) => a + b.value, 0);
    const doneRate = totalAll > 0 ? Math.round((m.status[0].value / totalAll) * 100) : 0;

    const peakMax = Math.max(...m.peaks.map((p) => p.value));
    const peaks = m.peaks.map((p) => {
      const isMax = p.value === peakMax && peakMax > 0;
      return {
        ...p,
        isMax,
        labelColor: isMax ? "#4F6AF5" : "#9b9588",
        tileBg: isMax ? "#eef1fe" : "#f8f9fb",
        tileBorder: isMax ? "1px solid #c7d2fe" : "1px solid transparent",
        valColor: isMax ? "#4F6AF5" : "#1a1d2e",
      };
    });

    const goals = m.goals.map((g) => {
      const pct = g.pct ?? 0;
      const over = pct >= 100;
      // 남은 개수 = 목표 − 실적. pct 미집계(null)면 미표시, 달성(≤0)이면 "목표 달성".
      const remaining = g.target - g.actual;
      return {
        ...g,
        actualText: g.actual.toLocaleString(),
        targetText: g.target.toLocaleString(),
        pctText: g.pct == null ? "—" : `${g.pct}%`,
        width: Math.min(pct, 100),
        barColor: over ? "#4F6AF5" : "#E8590C",
        tileBg: g.icon === "dawn" || g.icon === "noon" ? "#fff4e0" : "#e8eafe",
        remainingText:
          g.pct == null ? null : remaining <= 0 ? "목표 달성" : `${remaining.toLocaleString()}건 남음`,
        remainingDone: g.pct != null && remaining <= 0,
      };
    });

    return { acceptStatus, acceptOnDark, statusItems, doneRate, peaks, goals };
  }, [m]);
}

interface HomeScreenProps {
  today: HomeMetrics;
  week: HomeMetrics;
  todayDateShort: string;
  weekDateShort: string;
  profile: HomeProfile;
}

export function HomeScreen({
  today: todayM,
  week: weekM,
  todayDateShort,
  weekDateShort,
  profile,
}: HomeScreenProps) {
  const [tab, setTab] = useState<"today" | "week">("today");
  const today = tab === "today";
  const m = today ? todayM : weekM;
  const v = useHomeView(m);
  const router = useRouter();

  // 라이브 갱신: 스크래퍼 1분 주기에 맞춰 60s 폴링(server refetch). 탭 숨김 시 중단(낭비 방지).
  // router.refresh()는 서버 컴포넌트만 재실행 → 탭 선택 등 클라 상태는 보존.
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

  // 공동목표 유효 데이터 여부: 빈 배열(RPC 실패/[]) 또는 전부 null(미수집) → 빈 상태로 안내.
  const hasGoalData = v.goals.length > 0 && v.goals.some((g) => g.pct != null);

  const summaryLabel = today ? "오늘 운행 요약" : "주간 운행 요약";
  const dateShort = today ? todayDateShort : weekDateShort;

  return (
    <div className="px-3.5 py-[9px]">
      {/* 프로필 */}
      <div className="flex items-center gap-[11px] px-0.5 pb-1 pt-0.5">
        <div className="grid size-10 shrink-0 place-items-center bg-jb-indigo-tint2 text-[15px] font-black text-jb-indigo">
          {profile.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[17px] font-black tracking-[-0.02em]">{profile.name}</span>
            <span className="tnum whitespace-nowrap text-[11px] text-jb-ink-mute">UID {profile.uid}</span>
          </div>
        </div>
        {/* 상태 칩 = 탭하면 즉시 새로고침(수동). 자동은 60s 폴링. */}
        {profile.isLive ? (
          <button
            type="button"
            onClick={() => router.refresh()}
            title="탭하면 새로고침"
            className="inline-flex shrink-0 items-center gap-1 bg-jb-green-tint px-[9px] py-1 text-[11px] font-bold text-jb-green"
          >
            <span className="animate-pulse-dot size-[5px] bg-jb-green" />
            실시간
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.refresh()}
            title="탭하면 새로고침"
            className="inline-flex shrink-0 items-center gap-1 bg-jb-track px-[9px] py-1 text-[11px] font-bold text-jb-ink-mute"
          >
            <span className="size-[5px] bg-jb-ink-mute" />
            갱신지연
          </button>
        )}
      </div>

      {/* 오늘/주간 탭 */}
      <div className="mt-[9px] flex gap-1 bg-jb-tab-bg p-1">
        <TabButton active={today} onClick={() => setTab("today")}>
          오늘
        </TabButton>
        <TabButton active={!today} onClick={() => setTab("week")}>
          주간
        </TabButton>
      </div>

      {/* 오늘 운행 요약 섹션 — 헤더 + 내부 카드(배달건수/수락률 통일 폰트) */}
      <div className="mt-2">
        <div className="mb-1.5 flex items-center gap-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">{summaryLabel}</span>
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{dateShort}</span>
        </div>
        <div className="flex items-center justify-between border border-jb-line bg-white px-4 py-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[18px] font-bold text-jb-ink-soft">배달</span>
            <span className="tnum text-[18px] font-black text-jb-ink">{m.count}</span>
            <span className="text-[18px] font-bold text-jb-ink-soft">건</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-baseline gap-1">
              <span className="text-[18px] font-bold text-jb-ink-soft">수락률</span>
              <span className="flex items-baseline gap-px">
                <span className="tnum text-[18px] font-black" style={{ color: v.acceptStatus.color }}>{m.accept}</span>
                <span className="text-[18px] font-black" style={{ color: v.acceptStatus.color }}>%</span>
              </span>
            </span>
            <span
              className="px-2.5 py-[3px] text-[10.5px] font-black text-white"
              style={{ background: v.acceptStatus.color }}
            >
              {v.acceptStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* 운행 상태 */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">운행 상태</span>
        </div>
        <div className="border border-jb-line bg-white p-3 shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          <div className="grid grid-cols-4 gap-[7px]">
            {v.statusItems.map((it) => (
              <div key={it.label} className="px-1 py-[7px] text-center" style={{ background: it.tileBg }}>
                <div className="text-[11.5px] font-bold text-jb-ink-soft">{it.label}</div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: it.numColor }}>
                  {it.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 시간대별 분포 */}
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
                style={{ background: p.tileBg, border: p.tileBorder }}
              >
                <div className="text-[11.5px] font-bold" style={{ color: p.labelColor }}>
                  {p.label}
                </div>
                <div className="tnum mt-0.5 text-xl font-black tracking-[-0.02em]" style={{ color: p.valColor }}>
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 구간별 달성률 */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-xs font-black text-jb-ink">
            구간별 달성률 <span className="text-jb-indigo">· 협력사 공동목표</span>
          </span>
          <div className="mt-0.5 text-[11px] text-jb-ink-mute">구간 목표 대비 초과 달성 시 가점이 적립돼요</div>
        </div>
        <div className="border border-jb-line bg-white px-[13px] py-[9px] shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
          {!hasGoalData ? (
            <div className="flex flex-col items-center gap-1.5 py-4 text-center">
              <span className="text-[12.5px] font-bold text-jb-ink-soft">아직 집계된 공동목표가 없어요</span>
              <span className="text-[11px] text-jb-ink-mute">수집되면 자동으로 표시돼요</span>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-0.5 bg-jb-indigo-tint px-3 py-1 text-[11.5px] font-bold text-jb-indigo"
              >
                새로고침
              </button>
            </div>
          ) : (
            <div>
              {v.goals.map((g) => (
                <div key={g.label} className="mb-0.5 flex gap-[11px]">
                  <div className="relative shrink-0">
                    {g.badge ? (
                      <span className="tnum absolute -left-1.5 -top-1.5 z-[2] bg-jb-indigo px-[7px] py-0.5 text-[9.5px] font-black text-white shadow-[0_2px_5px_rgba(79,106,245,0.35)]">
                        {g.badge}
                      </span>
                    ) : null}
                    <div className="grid size-9 place-items-center" style={{ background: g.tileBg }}>
                      <GoalIconArt icon={g.icon} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-black tracking-[-0.02em]">{g.label}</div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="tnum text-[18px] font-black" style={{ color: g.barColor }}>
                        {g.actualText}
                      </span>
                      <span className="tnum text-[13px] font-bold text-jb-ink-mute">/ {g.targetText}건</span>
                      <span className="tnum text-[12.5px] font-black text-jb-ink-mute">{g.pctText}</span>
                      {g.remainingText ? (
                        <span
                          className={
                            "tnum ml-auto whitespace-nowrap text-[12px] font-black " +
                            (g.remainingDone ? "text-jb-green" : "text-jb-indigo")
                          }
                        >
                          {g.remainingText}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 h-[7px] overflow-hidden bg-jb-track">
                      <div
                        className="h-full"
                        style={{ width: `${g.width}%`, background: g.barColor }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        표시된 값은 참고용이며, 정산 기준값은 별도 공지 사항을 따릅니다.
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 py-[9px] text-[13.5px] transition-all " +
        (active
          ? "bg-white font-black text-jb-ink shadow-[0_1px_3px_rgba(20,23,46,0.1)]"
          : "bg-transparent font-bold text-jb-ink-mute")
      }
    >
      {children}
    </button>
  );
}
