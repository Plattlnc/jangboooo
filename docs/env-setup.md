# 환경 변수 · 배포 셋업 (devops)

jangboooo 는 두 런타임으로 나뉜다.

| 런타임 | 위치 | 호스팅 | 비밀키 |
|--------|------|--------|--------|
| 웹앱(대시보드) | repo 루트 (Next.js 16) | Vercel | anon 키 + (서버 액션용) service_role |
| 스크래퍼 워커 | `scraper/` (독립 패키지) | Railway | service_role + grider 자격증명 |

비밀 값은 **`.env.example` 만 커밋**한다. 실제 값은 Vercel/Railway 대시보드 또는
로컬 `.env.local`(웹) / `scraper/.env`(워커)에 둔다. `service_role` 키는 RLS 를
우회하므로 서버/스크래퍼 전용 — 브라우저로 절대 내려보내지 않는다.

## 환경 변수 매트릭스

| 키 | 웹(Vercel) | 워커(Railway) | 설명 |
|----|:---:|:---:|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅¹ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | — | 클라이언트 anon 키(RLS 적용) |
| `SUPABASE_URL` | — | ✅¹ | 워커용 URL(없으면 `NEXT_PUBLIC_SUPABASE_URL` 폴백) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅² | ✅ | RLS 우회. 서버/워커 전용 |
| `KAKAO_REST_API_KEY` / `KAKAO_CLIENT_SECRET` | ✅ | — | 카카오 간편로그인 |
| `KAKAO_IDENTITY_*` / `IDENTITY_VERIFY_*` | ✅ | — | 휴대폰 본인인증 |
| `ADMIN_PORTAL_URL` | — | ✅ | grider 포털 URL (**미확정**) |
| `ADMIN_PORTAL_ID` / `ADMIN_PORTAL_PASSWORD` | — | ✅ | grider 관리자 계정 (**미확정**) |
| `SCRAPE_INTERVAL_SECONDS` | — | ✅(기본 60) | 수집 주기(초) |
| `SCRAPE_TIMEZONE` | — | ✅(기본 Asia/Seoul) | 영업일(`snapshot_date`) 판정 TZ |
| `SCRAPE_MAX_RETRIES` | — | ✅(기본 3) | 사이클 재시도 횟수 |
| `SCRAPE_NAV_TIMEOUT_MS` | — | ✅(기본 30000) | Playwright 타임아웃(ms) |
| `HEADLESS` | — | ✅(기본 true) | 헤드리스 여부 |
| `STORAGE_STATE_PATH` | — | ✅(기본 `./.session/...`) | 로그인 세션 영속 경로 |
| `LOG_LEVEL` | — | ✅(기본 info) | debug/info/warn/error |

¹ 워커는 `SUPABASE_URL` 우선, 없으면 `NEXT_PUBLIC_SUPABASE_URL` 사용.
² 웹은 서버 액션/라우트에서만 사용(클라이언트 번들 노출 금지).

## Railway — 스크래퍼 배포

워커는 HTTP 서버가 아니라 **내부 스케줄러로 상주**하는 프로세스다(포트 노출 없음).

1. Railway 프로젝트 → New Service → **Deploy from GitHub repo** (`Plattlnc/jangboooo`).
2. 서비스 Settings → **Root Directory = `scraper`** (모노레포의 하위 패키지).
   - `scraper/railway.json` 이 `DOCKERFILE` 빌더 + `scraper/Dockerfile` 을 지정한다.
3. **Variables** 탭에 위 매트릭스의 워커 컬럼(✅) 값을 입력.
   - 자격증명(`ADMIN_PORTAL_*`) 미입력 시 **골격 모드**로 상주(수집 스킵) — 배포·기동 검증 가능.
4. 배포 후 **Logs** 에서 JSON 로그 확인:
   - 정상: `"워커 시작"` → (골격 모드면) `"골격 모드 — ADMIN_PORTAL_* 미설정..."`.
   - 자격증명 채운 뒤: `"로그인 시도"` → `"사이클 완료" {riders, snapshots, hourly}`.

### Dockerfile/Playwright 버전 동기화

`scraper/Dockerfile` 의 베이스 이미지 태그(`mcr.microsoft.com/playwright:vX.Y.Z-jammy`)는
`scraper/package.json` 의 `playwright` 버전과 **반드시 일치**해야 한다(브라우저/드라이버 충돌 방지).
playwright 를 올릴 때 두 곳을 함께 변경한다.

## Vercel — 웹앱 (참고)

루트 Next.js 앱은 Vercel 에 배포. Framework Preset = **Next.js**. 위 매트릭스의
웹 컬럼 변수를 Project Settings → Environment Variables 에 등록. (상세 CI/CD 는 후속 작업.)

## 로컬 개발

- 웹: 루트에서 `.env.local` 사용(Node 20+ `--env-file` 또는 Next 기본 로딩).
- 워커: `scraper/.env`(= `scraper/.env.example` 복사) 후 `npm run once`.
