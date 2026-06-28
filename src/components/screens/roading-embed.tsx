"use client";

// ROADING 사고접수 위자드(loading-app-two.vercel.app/step1)를 풀스크린 iframe 으로 임베드.
// URL search params 로 라이더 정보 전달 → ROADING 측이 sessionStorage 흡수 →
// users.upsert(name, phone) + 위자드 진행. 제출 시 postMessage 로 부모에게 알림(현재는 no-op).
//
// 정합성: nav.ts 의 "교통사고접수" 메뉴(/roading) 진입점과 자연스럽게 연결됨.
// 권한: <iframe allow="camera; geolocation"> — step2 인앱 카메라 + step3 GPS 위치.

import { useEffect } from "react";

const ROADING_ORIGIN = "https://loading-app-two.vercel.app";

interface Props {
  riderId: string;
  riderName: string;
  riderPhone: string | null;
}

interface PostMessageData {
  type?: string;
  displayNumber?: string | null;
  accidentId?: string | null;
}

export function RoadingEmbed({ riderId, riderName, riderPhone }: Props) {
  const iframeUrl = (() => {
    const params = new URLSearchParams({
      rider_id: riderId,
      source: "jangboooo",
      name: riderName,
    });
    if (riderPhone) params.set("phone", riderPhone);
    return `${ROADING_ORIGIN}/step1?${params.toString()}`;
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

  // (rider) layout 의 main padding(px-[26px] pb-8) 을 negative margin 으로 무력화 + AppBar(h-14) 제외 풀 높이.
  return (
    <div className="-mx-[26px] -mb-8">
      <iframe
        src={iframeUrl}
        title="ROADING 사고접수"
        allow="camera; geolocation; clipboard-write"
        className="block w-full border-0"
        style={{ height: "calc(100dvh - 56px)" }}
      />
    </div>
  );
}
