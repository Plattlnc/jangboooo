"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Megaphone, ChevronRight } from "lucide-react";
import type { HomeMetrics } from "@/lib/mock/home";
import type { HomeProfile } from "./home-view";
import { TierBadge } from "@/components/ui/tier-badge";
import { PROMO_WEEKLY_THRESHOLD, PROMO_UNIT_KRW, weeklyPromo } from "@/lib/promo";

export interface HomeFeatured {
  id: string;
  title: string;
  excerpt: string;
}

// 홈(SLA 대시보드) — 오늘/주간 탭 전환. 파생값 로직은 유지, 스타일은 토스 라이트 핀테크(.toss-home 스코프).
// 색은 시맨틱 CSS 변수(var(--jb-*))로 지정 → .toss-home 스코프에서 Toss 팔레트로 해석(라이트/다크 자동).

// 데이터 모델의 시맨틱 hex → 토큰 var 매핑(완료=성공/거절=위험/배차취소=경고/배달취소=중립).
const SEMANTIC: Record<string, { color: string; tint: string }> = {
  "#1E9E5A": { color: "var(--jb-green)", tint: "var(--jb-green-tint)" },
  "#D9342B": { color: "var(--jb-red)", tint: "var(--jb-red-tint)" },
  "#E8590C": { color: "var(--jb-orange)", tint: "var(--jb-orange-tint)" },
  "#9b9588": { color: "var(--jb-ink-mute)", tint: "var(--jb-track)" },
};

function useHomeView(m: HomeMetrics) {
  return useMemo(() => {
    const acceptStatus =
      m.accept >= 85
        ? { label: "양호", color: "var(--jb-green)", tint: "var(--jb-green-tint)" }
        : m.accept >= 70
          ? { label: "주의", color: "var(--jb-orange)", tint: "var(--jb-orange-tint)" }
          : { label: "위험", color: "var(--jb-red)", tint: "var(--jb-red-tint)" };

    const statusItems = m.status.map((it) => {
      // 타일 활성(색) 판정은 일반+B마트+스토어 합산 — 일반 0건이어도 B마트/스토어만 있으면 활동으로 표시.
      const total = it.value + (it.bmart ?? 0) + (it.store ?? 0);
      const sem = SEMANTIC[it.color] ?? { color: "var(--jb-ink-mute)", tint: "var(--jb-track)" };
      return {
        ...it,
        tileBg: total > 0 ? sem.tint : "var(--jb-track)",
        numColor: total > 0 ? sem.color : "var(--jb-ink-mute)",
      };
    });
    const totalAll = m.status.reduce((a, b) => a + b.value, 0);
    const doneRate = totalAll > 0 ? Math.round((m.status[0].value / totalAll) * 100) : 0;

    const peakMax = Math.max(...m.peaks.map((p) => p.value));
    const peaks = m.peaks.map((p) => {
      const isMax = p.value === peakMax && peakMax > 0;
      return {
        ...p,
        isMax,
        labelColor: isMax ? "var(--jb-indigo)" : "var(--jb-ink-mute)",
        tileBg: isMax ? "var(--jb-indigo-tint)" : "var(--jb-track)",
        valColor: isMax ? "var(--jb-indigo)" : "var(--jb-ink)",
      };
    });

    const goals = m.goals.map((g) => {
      const pct = g.pct ?? 0;
      const over = pct >= 100;
      // 남은 개수 = 목표 − 실적. pct 미집계(null)면 미표시, 달성(≤0)이면 "목표 달성".
      const remaining = g.target - g.actual;
      return {
        ...g,
        targetText: g.target.toLocaleString(),
        pctText: g.pct == null ? "—" : `${g.pct}%`,
        width: Math.min(pct, 100),
        barColor: over ? "var(--jb-indigo)" : "var(--jb-orange)",
        remainingText:
          g.pct == null ? null : remaining <= 0 ? "목표 달성" : `${remaining.toLocaleString()}건 남음`,
        remainingDone: g.pct != null && remaining <= 0,
      };
    });

    const hasBmartSplit = m.status.some((it) => it.bmart != null);

    return { acceptStatus, statusItems, hasBmartSplit, doneRate, peaks, goals };
  }, [m]);
}

interface HomeScreenProps {
  today: HomeMetrics;
  week: HomeMetrics;
  todayDateShort: string;
  weekDateShort: string;
  profile: HomeProfile;
  featured: HomeFeatured | null;
}

export function HomeScreen({
  today: todayM,
  week: weekM,
  todayDateShort,
  weekDateShort,
  profile,
  featured,
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

  const cardCls = "rounded-[20px] bg-jb-card shadow-[var(--toss-shadow)]";

  return (
    <div className="toss-home px-4 pb-6 pt-[14px]">
      {/* 프로필 — 아바타(내정보 등록 사진, 없으면 이니셜). UID 미표기(2026-07-31 사용자 확정). */}
      <div className="flex items-center gap-[11px] px-0.5 pb-1 pt-0.5">
        {profile.avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 40px 고정 아바타, 원격 도메인 미설정 */
          <img src={profile.avatarUrl} alt="" className="size-10 shrink-0 rounded-[14px] object-cover" />
        ) : (
          <div className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-jb-indigo-tint text-[15px] font-extrabold text-jb-indigo">
            {profile.initial}
          </div>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-[17px] font-extrabold tracking-[-0.02em] text-jb-ink">
            {profile.name} <span className="font-bold text-jb-ink-soft">라이더</span>
          </span>
          {profile.tier ? <TierBadge tier={profile.tier} size={36} /> : null}
        </div>
        {/* 상태 칩 = 탭하면 즉시 새로고침(수동). 자동은 60s 폴링. */}
        {profile.isLive ? (
          <button
            type="button"
            onClick={() => router.refresh()}
            title="탭하면 새로고침"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-jb-green-tint px-[10px] py-1 text-[11px] font-bold text-jb-green transition-transform duration-150 active:scale-[0.97]"
          >
            <span className="animate-pulse-dot size-[5px] rounded-full bg-jb-green" />
            실시간
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.refresh()}
            title="탭하면 새로고침"
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-jb-track px-[10px] py-1 text-[11px] font-bold text-jb-ink-mute transition-transform duration-150 active:scale-[0.97]"
          >
            <span className="size-[5px] rounded-full bg-jb-ink-mute" />
            갱신지연
          </button>
        )}
      </div>

      {/* 공지 배너 — 홈 노출(featured) 공지 1건 */}
      {featured ? (
        <Link
          href={`/notice/${featured.id}`}
          className="mt-2.5 flex items-center gap-2.5 rounded-[16px] bg-jb-card px-3.5 py-2.5 shadow-[var(--toss-shadow)] transition-transform active:scale-[0.99]"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-jb-indigo-tint text-jb-indigo">
            <Megaphone size={15} strokeWidth={2.2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-black text-jb-ink">{featured.title}</span>
            {featured.excerpt ? (
              <span className="block truncate text-[11px] text-jb-ink-mute">{featured.excerpt}</span>
            ) : null}
          </span>
          <ChevronRight size={16} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
        </Link>
      ) : null}

      {/* 오늘/주간 세그먼트 토글 — 트랙 위에 선택 항목만 카드색+옅은 그림자 */}
      <div className="mt-2.5 flex gap-1 rounded-[16px] bg-jb-tab-bg p-1">
        <TabButton active={today} onClick={() => setTab("today")}>
          오늘
        </TabButton>
        <TabButton active={!today} onClick={() => setTab("week")}>
          주간
        </TabButton>
      </div>

      {/* 오늘 운행 요약 섹션 — 헤더 + 내부 카드(배달건수/수락률 통일 폰트) */}
      <div className="mt-3">
        <div className="mb-2 flex items-center gap-1.5 px-0.5">
          <span className="text-[15px] font-extrabold text-jb-ink">{summaryLabel}</span>
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{dateShort}</span>
        </div>
        <div className={cardCls + " flex items-center justify-between px-[18px] py-4"}>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-bold text-jb-ink-soft">배달</span>
            <span className="tnum text-[22px] font-extrabold tracking-[-0.02em] text-jb-ink">
              <CountUp value={m.count} />
            </span>
            <span className="text-[15px] font-bold text-jb-ink-soft">건</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold text-jb-ink-soft">수락률</span>
              <span className="flex items-baseline gap-px">
                <span className="tnum text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: v.acceptStatus.color }}>
                  <CountUp value={m.accept} />
                </span>
                <span className="text-[15px] font-extrabold" style={{ color: v.acceptStatus.color }}>%</span>
              </span>
            </span>
            <span
              className="rounded-full px-2.5 py-[3px] text-[10.5px] font-extrabold"
              style={{ background: v.acceptStatus.tint, color: v.acceptStatus.color }}
            >
              {v.acceptStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* 운행 상태 */}
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-extrabold text-jb-ink">운행 상태</span>
          {v.hasBmartSplit ? (
            <span className="text-[11px] font-bold text-jb-ink-mute">일반 배달 기준 · B마트/스토어 별도</span>
          ) : null}
        </div>
        <div className={cardCls + " p-[14px]"}>
          <div className="grid grid-cols-4 gap-2">
            {v.statusItems.map((it) => (
              <div key={it.label} className="rounded-[14px] px-1 py-[9px] text-center" style={{ background: it.tileBg }}>
                <div className="text-[11.5px] font-bold text-jb-ink-soft">{it.label}</div>
                <div className="tnum mt-0.5 text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: it.numColor }}>
                  {it.value}
                </div>
                {it.bmart != null ? (
                  <div
                    className={
                      "tnum text-[10px] font-bold " +
                      (it.bmart > 0 ? "text-jb-ink-soft" : "text-jb-ink-mute")
                    }
                  >
                    B마트 {it.bmart}
                  </div>
                ) : null}
                {it.store != null ? (
                  <div
                    className={
                      "tnum text-[10px] font-bold " +
                      (it.store > 0 ? "text-jb-ink-soft" : "text-jb-ink-mute")
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

      {/* 시간대별 분포 */}
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="text-[15px] font-extrabold text-jb-ink">시간대별 분포</span>
          <span className="text-[11px] font-bold text-jb-indigo">최다 시간대 강조</span>
        </div>
        <div className={cardCls + " p-[14px]"}>
          <div className="grid grid-cols-4 gap-2">
            {v.peaks.map((p) => (
              <div
                key={p.label}
                className="rounded-[14px] px-1 py-[9px] text-center"
                style={{ background: p.tileBg }}
              >
                <div className="text-[11.5px] font-bold" style={{ color: p.labelColor }}>
                  {p.label}
                </div>
                <div className="tnum mt-0.5 text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: p.valColor }}>
                  {p.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 자사 프로모션 (주간 보너스) — 탭과 무관하게 항상 이번 주 기준. 공동목표 상단 고정. */}
      {(() => {
        const promo = weeklyPromo(weekM.count);
        const barColor = promo.reached ? "var(--jb-green)" : "var(--jb-indigo)";
        return (
          <div className="mt-3">
            <div className="mb-2 px-0.5">
              <span className="text-[15px] font-extrabold text-jb-ink">
                자사 프로모션 <span className="text-jb-indigo">· 주간 보너스</span>
              </span>
              <div className="mt-0.5 text-[11px] text-jb-ink-mute">
                주간 {PROMO_WEEKLY_THRESHOLD}건 초과분 1건당 +{PROMO_UNIT_KRW.toLocaleString("ko-KR")}원 · 매주 초기화
              </div>
            </div>
            <div className={cardCls + " px-[18px] py-[15px]"}>
              <div className="flex items-center gap-1.5">
                <span className="text-[14.5px] font-extrabold tracking-[-0.02em] text-jb-ink">
                  현재 보너스{" "}
                  <span className={"tnum " + (promo.earning ? "text-jb-green" : "text-jb-ink-mute")}>
                    +<CountUp value={promo.bonusKrw} />원
                  </span>
                </span>
                {promo.earning ? (
                  <span className="rounded-full bg-jb-green-tint px-[9px] py-0.5 text-[9.5px] font-extrabold text-jb-green">적립중</span>
                ) : null}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="tnum text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: barColor }}>
                  <CountUp value={weekM.count} />
                </span>
                <span className="tnum text-[13px] font-bold text-jb-ink-mute">/ {PROMO_WEEKLY_THRESHOLD}건</span>
                <span className="tnum text-[12.5px] font-extrabold text-jb-ink-mute">{promo.progressPct}%</span>
                <span
                  className={
                    "tnum ml-auto whitespace-nowrap text-[12px] font-extrabold " +
                    (promo.reached ? "text-jb-green" : "text-jb-indigo")
                  }
                >
                  {promo.earning
                    ? `초과 ${promo.bonusCount}건 × ${PROMO_UNIT_KRW.toLocaleString("ko-KR")}원`
                    : promo.reached
                      ? "다음 배달부터 적립!"
                      : `${promo.remaining}건 남음`}
                </span>
              </div>
              <Bar pct={promo.progressPct} color={barColor} />
            </div>
          </div>
        );
      })()}

      {/* 구간별 달성률 */}
      <div className="mt-3">
        <div className="mb-2 px-0.5">
          <span className="text-[15px] font-extrabold text-jb-ink">
            구간별 달성률 <span className="text-jb-indigo">· 협력사 공동목표</span>
          </span>
          <div className="mt-0.5 text-[11px] text-jb-ink-mute">구간 목표 대비 초과 달성 시 가점이 적립돼요</div>
        </div>
        <div className={cardCls + " px-[18px] py-1.5"}>
          {!hasGoalData ? (
            <div className="flex flex-col items-center gap-1.5 py-5 text-center">
              <span className="text-[12.5px] font-bold text-jb-ink-soft">아직 집계된 공동목표가 없어요</span>
              <span className="text-[11px] text-jb-ink-mute">수집되면 자동으로 표시돼요</span>
              <button
                type="button"
                onClick={() => router.refresh()}
                className="mt-0.5 rounded-full bg-jb-indigo-tint px-3.5 py-1.5 text-[11.5px] font-bold text-jb-indigo transition-transform duration-150 active:scale-[0.97]"
              >
                새로고침
              </button>
            </div>
          ) : (
            <div>
              {v.goals.map((g) => (
                <div key={g.label} className="border-t border-jb-line-soft py-[11px] first:border-t-0 first:pt-2 last:pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14.5px] font-extrabold tracking-[-0.02em] text-jb-ink">{g.label}</span>
                    {g.badge ? (
                      <span className="tnum rounded-full bg-jb-indigo-tint px-[9px] py-0.5 text-[9.5px] font-extrabold text-jb-indigo">
                        {g.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="tnum text-[22px] font-extrabold tracking-[-0.02em]" style={{ color: g.barColor }}>
                        <CountUp value={g.actual} />
                      </span>
                      <span className="tnum text-[13px] font-bold text-jb-ink-mute">/ {g.targetText}건</span>
                      <span className="tnum text-[12.5px] font-extrabold text-jb-ink-mute">{g.pctText}</span>
                      {g.remainingText ? (
                        <span
                          className={
                            "tnum ml-auto whitespace-nowrap text-[12px] font-extrabold " +
                            (g.remainingDone ? "text-jb-green" : "text-jb-indigo")
                          }
                        >
                          {g.remainingText}
                        </span>
                      ) : null}
                    </div>
                    <Bar pct={g.width} color={g.barColor} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pb-0.5 text-center text-[11px] text-jb-ink-mute">
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
        "flex-1 rounded-[12px] py-[9px] text-[13.5px] transition-all duration-150 active:scale-[0.97] " +
        (active
          ? "bg-jb-card font-extrabold text-jb-ink shadow-[var(--toss-shadow)]"
          : "bg-transparent font-bold text-jb-ink-mute")
      }
    >
      {children}
    </button>
  );
}

/** 핵심 숫자 카운트업(0→목표, easeOutCubic ~600ms). 마운트·값 변경 시 재생. */
function useCountUp(target: number, ms = 600): number {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setVal(to);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min(1, (ts - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return val;
}

function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const v = useCountUp(value);
  const fmt = format ?? ((n: number) => Math.round(n).toLocaleString("ko-KR"));
  return <>{fmt(v)}</>;
}

/** 진행바 — 마운트/값 변경 시 0→목표 폭을 ease-out 으로 채운다(520ms). */
function Bar({ pct, color }: { pct: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);
  return (
    <div className="mt-1.5 h-[7px] overflow-hidden rounded-full" style={{ background: "var(--jb-track)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-[520ms] ease-out"
        style={{ width: `${w}%`, background: color }}
      />
    </div>
  );
}
