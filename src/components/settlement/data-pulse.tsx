"use client";

import { useEffect, useRef, useState } from "react";

// 데이터 신선도 인디케이터 — 소스 테이블 최신 captured_at 을 폴링해
// [수집 상태 점 · 라벨 · 최신 업데이트 시각 · 상대시간(1초 틱)] 을 한 줄 pill 로 표시.
// 새 데이터 감지 시 하이라이트 플래시. 값을 못 가져오면(테이블 미생성 등) 조용히 숨김.
//
// 상태 판정(마지막 업데이트 경과):
//   ≤3분  = 실시간 수집 중(초록 pulse)  ·  ≤26시간 = 최신(파랑)  ·  그 외 = 대기(회색)

type Source = "daily" | "hourly" | "extra" | "insurance" | "revenue";

const LIVE_MS = 3 * 60 * 1000;
const FRESH_MS = 26 * 60 * 60 * 1000;

function fmtAbs(ts: string): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtRel(ageMs: number): string {
  const s = Math.max(0, Math.floor(ageMs / 1000));
  if (s < 60) return `${s}초 전`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function DataPulse({
  source,
  label,
  cadence,
  pollMs = 30_000,
}: {
  source: Source;
  label: string;
  /** 수집 주기 안내(툴팁 겸 서브텍스트). 예: "매일 08:00 자동 수집" */
  cadence?: string;
  pollMs?: number;
}) {
  const [ts, setTs] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null); // 1초 틱(렌더 순수성 — Date.now 는 effect 에서만)
  const [flash, setFlash] = useState(false);
  const prevTs = useRef<string | null>(null);
  const gone = useRef(false);

  useEffect(() => {
    gone.current = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const res = await fetch(`/settlement/api/freshness?src=${source}`, { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as { ts: string | null };
          if (!gone.current && body.ts) {
            if (prevTs.current && body.ts > prevTs.current) {
              setFlash(true);
              setTimeout(() => !gone.current && setFlash(false), 2500);
            }
            prevTs.current = body.ts;
            setTs(body.ts);
          }
        }
      } catch {
        /* 네트워크 일시 오류 — 다음 폴링에서 재시도 */
      }
      if (!gone.current) timer = setTimeout(poll, pollMs);
    };
    void poll();
    // 초기 now 는 rAF 경유 — effect 본문 동기 setState 캐스케이드 린트 회피(테마토글 패턴).
    const raf = requestAnimationFrame(() => setNow(Date.now()));
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      gone.current = true;
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(raf);
      clearInterval(tick);
    };
  }, [source, pollMs]);

  if (!ts || now == null) return null;

  const age = now - new Date(ts).getTime();
  const state = age <= LIVE_MS ? "live" : age <= FRESH_MS ? "fresh" : "idle";
  const stateLabel = state === "live" ? "실시간 수집 중" : state === "fresh" ? "최신" : "업데이트 대기";

  return (
    <div
      title={cadence}
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] transition-colors duration-700 " +
        (flash
          ? "border-jb-indigo/40 bg-jb-indigo-tint"
          : "border-jb-line bg-jb-card")
      }
    >
      <span className="relative flex size-2">
        {state === "live" ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        ) : null}
        <span
          className={
            "relative inline-flex size-2 rounded-full " +
            (state === "live" ? "bg-emerald-500" : state === "fresh" ? "bg-jb-indigo" : "bg-jb-ink-mute/50")
          }
        />
      </span>
      <span className="font-semibold text-jb-ink-soft">{label}</span>
      <span className={"font-medium " + (state === "live" ? "text-emerald-600" : "text-jb-ink-mute")}>
        {flash ? "새 데이터 반영됨" : stateLabel}
      </span>
      <span className="text-jb-ink-mute">
        최신 업데이트 <span className="font-semibold tabular-nums text-jb-ink-soft">{fmtAbs(ts)}</span>
        <span className="tabular-nums"> · {fmtRel(age)}</span>
      </span>
    </div>
  );
}
