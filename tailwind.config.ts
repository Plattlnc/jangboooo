import type { Config } from "tailwindcss";

/**
 * jangboooo — Tailwind v4 설정 (CSS-first 보조)
 *
 * ⚠️ 디자인 토큰(색/타이포/간격/라운딩/그림자/모션)은 모두
 *    `src/styles/tokens.css` 의 `@theme inline` 에 정의되어 있다.
 *    이 파일은 v4 CSS-first 를 보완하는 최소 설정만 담는다:
 *      - content 글롭 (유틸 트리셰이킹 대상)
 *    색상/스케일을 여기 theme.extend 에 중복 정의하지 말 것 (SSOT = tokens.css).
 *
 *    ※ darkMode/ dark 변형은 `globals.css` 의 `@custom-variant dark`
 *      (= [data-theme="dark"]) 가 SSOT. 여기서 darkMode 를 재정의하면
 *      변형 중복 정의가 되므로 두지 않는다.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
