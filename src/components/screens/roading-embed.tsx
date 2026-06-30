"use client";

// ROADING 사고접수 위자드(loading-app-two.vercel.app/step1)를 풀스크린 iframe 으로 임베드.
// URL search params 로 라이더 정보 전달 → ROADING 측이 sessionStorage 흡수 →
// users.upsert(name, phone) + 위자드 진행. 제출 시 postMessage 로 부모에게 알림(현재는 no-op).
//
// 정합성: nav.ts 의 "교통사고접수" 메뉴(/roading) 진입점과 자연스럽게 연결됨.
// 권한: <iframe allow="camera; geolocation"> — step2 인앱 카메라 + step3 GPS 위치.
//
// origin 은 env(NEXT_PUBLIC_ROADING_ORIGIN)로 주입 — 로컬/스테이징 전환 + 추후 SDK 화 대비.
// isDemo(목 라이더)일 때는 source 를 "jangboooo-demo" + demo=1 로 표기해 ROADING 운영 데이터 오염 방지.

import { useEffect, useRef, useState } from "react";

const ROADING_ORIGIN =
  process.env.NEXT_PUBLIC_ROADING_ORIGIN ?? "https://loading-app-two.vercel.app";

// iframe 이 이 시간 내 load 되지 않으면 폴백(새 탭으로 열기) 안내.
const LOAD_TIMEOUT_MS = 12000;

interface Props {
  riderId: string;
  riderName: string;
  riderPhone: string | null;
  /** 등록 차량번호 — ROADING step2 '내차량' 표기용(있을 때만 전달) */
  riderPlate?: string | null;
  /** 목 프로필(데모) 여부 — ROADING 운영 데이터 오염 방지용 표기 */
  isDemo?: boolean;
  /** 임베드할 ROADING 경로 (기본 /step1=사고접수 위자드, /history=접수 내역 등) */
  path?: string;
  /** iframe 제목/접근성 라벨 */
  title?: string;
}

interface PostMessageData {
  type?: string;
  displayNumber?: string | null;
  accidentId?: string | null;
}

export function RoadingEmbed({
  riderId,
  riderName,
  riderPhone,
  riderPlate,
  isDemo = false,
  path = "/step1",
  title = "ROADING 사고접수",
}: Props) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iframeUrl = (() => {
    const params = new URLSearchParams({
      rider_id: riderId,
      source: isDemo ? "jangboooo-demo" : "jangboooo",
      name: riderName,
    });
    if (riderPhone) params.set("phone", riderPhone);
    if (riderPlate) params.set("plate", riderPlate);
    if (isDemo) params.set("demo", "1");
    return `${ROADING_ORIGIN}${path}?${params.toString()}`;
  })();

  // ROADING iframe → 부모 메시지 수신. origin 검증 필수.
  // 풀스크린이라 iframe 내부에서 complete 화면이 그대로 보이므로 부모는 분석/로깅용으로만 사용.
  useEffect(() => {
    const handler = (e: MessageEvent<PostMessageData>) => {
      if (e.origin !== ROADING_ORIGIN) return;
      const msg = e.data;
      if (msg?.type === "roading:accident-submitted" && msg.displayNumber) {
        // 분석/로깅 진입점 — 현재는 콘솔만.
        console.log("[ROADING] 접수 완료:", msg.displayNumber);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // 로드 타임아웃 — 정상 로드되면 onLoad 가 해제.
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setStatus((s) => (s === "loaded" ? s : "error"));
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleLoaded = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setStatus("loaded");
  };

  const frameHeight = "calc(100dvh - 56px)";

  // (rider) layout 의 main padding(px-[26px] pb-8) 을 negative margin 으로 무력화 + AppBar(h-14) 제외 풀 높이.
  return (
    <div className="relative -mx-[26px] -mb-8" style={{ height: frameHeight }}>
      <iframe
        src={iframeUrl}
        title={title}
        allow="camera; geolocation; clipboard-write"
        className="block h-full w-full border-0"
        onLoad={handleLoaded}
        onError={() => setStatus("error")}
      />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-600" />
          <p className="text-sm text-gray-500">{title}을(를) 불러오는 중…</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center">
          <p className="text-base font-semibold text-gray-800">
            화면을 불러오지 못했어요
          </p>
          <p className="text-sm text-gray-500">
            네트워크 상태를 확인하거나 아래 버튼으로 새 창에서 열어주세요.
          </p>
          <a
            href={iframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            새 창에서 열기
          </a>
        </div>
      )}
    </div>
  );
}
