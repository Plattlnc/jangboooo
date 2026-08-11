import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 공지 이미지 업로드(서버 액션 FormData) — 기본 1MB 라 폰 사진(수 MB)이 전송 단계에서
    // 조용히 거부되던 문제. 클라에서 1920px JPEG 압축 후 전송하지만 폴백(원본) 여유까지 12mb.
    serverActions: {
      bodySizeLimit: "12mb",
    },
    // 클라이언트 라우터 캐시: 동적 세그먼트 30s 재사용 — 탭/뒤로가기 이동 즉시 표시.
    // 데이터 신선도는 스크래퍼 1분 주기 + 홈 60s 폴링(router.refresh 는 캐시 우회)이 담보.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
