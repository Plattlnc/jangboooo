import type { MetadataRoute } from "next";

// 라이더 본인 전용 사적 도구 — 전 경로 검색 비노출 (seo-checklist §4).
// OG 미리보기(카카오 공유)는 noindex 와 무관하게 동작한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
