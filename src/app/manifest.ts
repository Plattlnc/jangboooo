import type { MetadataRoute } from "next";

// PWA manifest. 값/색 SSOT: docs/design/04-brand-assets.md §1·3 (dark 고정).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "배달장부2",
    short_name: "배달장부2",
    description:
      "완료·수락률·취소까지 내 배달 실적을 오늘·주·월로 한눈에. 라이더 본인용 대시보드.",
    lang: "ko",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0f172a",
    background_color: "#060b18",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
