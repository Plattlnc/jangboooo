import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// QA 테스트 전용 설정 (소유: qa / tests/).
// - 경로 별칭 @ → src (tsconfig paths 와 동일)
// - server-only 는 테스트에서 무력화(빈 스텁) — 서버 가드 모듈을 노드에서 import 하기 위함
// - 기본 환경 jsdom: 순수 유닛 + 컴포넌트 렌더 양쪽 커버
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/_stubs/server-only.ts", import.meta.url)),
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
  },
});
