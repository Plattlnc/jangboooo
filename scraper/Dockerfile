# ───────────────────────────────────────────────────────────
# scraper 워커 이미지 (Railway). Playwright 공식 베이스 = 브라우저 +
# 시스템 의존성 사전 설치본.
# ⚠️ 아래 태그의 Playwright 버전은 package.json 의 "playwright" 버전과
#    반드시 일치시킬 것 (불일치 시 브라우저/드라이버 버전 충돌).
# ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

# 1) 의존성 레이어 (소스보다 먼저 복사해 캐시 활용)
COPY package.json package-lock.json* ./
# 락파일 있으면 ci, 없으면 install 폴백. dev 의존성(typescript 등)은 런타임 불필요.
RUN npm ci --omit=dev || npm install --omit=dev

# 2) 소스
COPY . .

ENV NODE_ENV=production
# 내부 스케줄러로 상주하는 워커 — 외부 포트 노출 없음. 시크릿은 Railway 주입.
# ⚠️ `npm run start` 로 띄우면 npm 이 PID 1 이 되어 SIGTERM 을 자식(tsx)에게
#    전달하지 못한다 → index.ts 의 그레이스풀 종료 핸들러가 안 돌고, Railway 중지 시
#    `npm error signal SIGTERM / command sh -c tsx src/index.ts` 로깅. 따라서 앱(tsx)을
#    직접 exec 해 PID 1 로 두고 SIGTERM 을 직접 받게 한다(= package.json start 와 동일 명령).
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/index.ts"]
