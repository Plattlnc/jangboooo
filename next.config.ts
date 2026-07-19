import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 클라이언트 라우터 캐시: 동적 세그먼트 30s 재사용 — 탭/뒤로가기 이동 즉시 표시.
    // 데이터 신선도는 스크래퍼 1분 주기 + 홈 60s 폴링(router.refresh 는 캐시 우회)이 담보.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
