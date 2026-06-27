import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// 각 테스트 후 DOM 정리 + 모듈 모킹 리셋.
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom 에는 matchMedia 가 없다. 기본은 "reduced-motion 선호"로 둬
// 카운트업/애니메이션이 즉시 최종값이 되게 해 렌더 단언을 결정적으로 만든다.
// 개별 테스트에서 필요 시 재정의 가능.
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
