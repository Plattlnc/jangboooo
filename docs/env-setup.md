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
| `NEXT_PUBLIC_SITE_URL` | ✅ | — | 배포 절대 URL(SEO/OG/메타 baseUrl). 예: `https://<도메인>` |
| `SUPABASE_URL` | — | ✅¹ | 워커용 URL(없으면 `NEXT_PUBLIC_SUPABASE_URL` 폴백) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅² | ✅ | RLS 우회. 서버/워커 전용 |
| `IDENTITY_VERIFY_PROVIDER` | ✅(`kakao`) | — | 본인확인 어댑터. 미설정 시 `PROVIDER_NOT_CONFIGURED` 안전차단 |
| `KAKAO_IDENTITY_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI` | ✅ | — | 휴대폰 본인확인(서버). REDIRECT_URI=배포 도메인 일치 |
| `IDENTITY_VERIFY_SANDBOX` | dev only | — | **운영 금지**. true 면 `mock:01012345678` 토큰 허용 |
| `KAKAO_REST_API_KEY` / `KAKAO_CLIENT_SECRET` | —³ | — | 카카오 **간편로그인** — Supabase Auth Provider(대시보드)에 입력, Vercel env 아님 |
| `ADMIN_PORTAL_URL` | — | ✅ | grider 포털 URL (확정: `https://jangboo.grider.ai/dashboard`) |
| `ADMIN_PORTAL_ID` / `ADMIN_PORTAL_PASSWORD` | — | ✅ | grider 관리자 계정 (**미확정** — 인증 샘플 대기) |
| `SCRAPE_INTERVAL_SECONDS` | — | ✅(기본 60) | 수집 주기(초) = 한 틱 시간 예산 |
| `SCRAPE_TIMEZONE` | — | ✅(기본 Asia/Seoul) | 영업일(`snapshot_date`) 판정 TZ |
| `SCRAPE_MAX_RETRIES` | — | ✅(기본 3) | 사이클 재시도 횟수 |
| `SCRAPE_NAV_TIMEOUT_MS` | — | ✅(기본 30000) | Playwright 타임아웃(ms) |
| `HEADLESS` | — | ✅(기본 true) | 헤드리스 여부 |
| `STORAGE_STATE_PATH` | — | ✅(기본 `./.session/...`) | 로그인 세션 영속 경로 |
| `LOG_LEVEL` | — | ✅(기본 info) | debug/info/warn/error |
| `SCRAPE_MOCK` | — | ✅(기본 false) | **운영 금지**. true 면 grider 미접속·mock 적재로 파이프라인 검증 |

¹ 워커는 `SUPABASE_URL` 우선, 없으면 `NEXT_PUBLIC_SUPABASE_URL` 사용.
² 웹은 서버 액션/라우트에서만 사용(클라이언트 번들 노출 금지).
³ 코드는 `KAKAO_REST_API_KEY/CLIENT_SECRET` 를 직접 읽지 않음 — 간편로그인은 Supabase Auth Kakao Provider 가 처리. 키는 Supabase 대시보드에 입력(아래 Supabase 절).

## Railway — 스크래퍼 배포

워커는 HTTP 서버가 아니라 **내부 스케줄러로 상주**하는 프로세스다(포트 노출 없음).

1. Railway 프로젝트 → New Service → **Deploy from GitHub repo** (`Plattlnc/jangboooo`).
2. 서비스 Settings → **Root Directory = `scraper`** (모노레포의 하위 패키지).
   - `scraper/railway.json` 이 `DOCKERFILE` 빌더 + `scraper/Dockerfile` 을 지정한다.
3. **Variables** 탭에 위 매트릭스의 워커 컬럼(✅) 값을 입력.
   - 자격증명(`ADMIN_PORTAL_*`) 미입력 시 **골격 모드**로 상주(수집 스킵) — 배포·기동 검증 가능.
   - 적재 파이프라인을 실데이터 없이 점검하려면 일시적으로 `SCRAPE_MOCK=true`(검증 후 제거, 운영 금지).
4. 배포 후 **Logs** 에서 JSON 로그 확인:
   - 정상: `"워커 시작"` → (골격 모드면) `"골격 모드 — ADMIN_PORTAL_* 미설정..."`.
   - MOCK: `"MOCK 모드 ..."` → `"사이클 완료" {riders:2, snapshots:2, hourly:4}`.
   - 자격증명 채운 뒤: `"로그인 시도"` → `"사이클 완료" {riders, snapshots, hourly}`.

### Dockerfile/Playwright 버전 동기화

`scraper/Dockerfile` 의 베이스 이미지 태그(`mcr.microsoft.com/playwright:vX.Y.Z-jammy`)는
`scraper/package.json` 의 `playwright` 버전과 **반드시 일치**해야 한다(브라우저/드라이버 충돌 방지).
playwright 를 올릴 때 두 곳을 함께 변경한다.

## Supabase — 프로비저닝 + 마이그레이션 적용

웹앱과 스크래퍼가 **같은 Supabase 프로젝트**를 공유한다. 순서: 프로젝트 생성 → 마이그레이션 → 키 배포 → Auth 설정.

1. supabase.com 에서 프로젝트 생성. Settings → API 에서 값 확보:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` (+워커 `SUPABASE_URL`)
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**비밀** — 서버/워커 전용, 클라이언트 금지)

2. 마이그레이션 — `supabase/migrations/` 3개를 **순서대로** 적용. 순서 의존:
   `0001_core_schema`(테이블) → `0002_rls`(0001 필요) → `0003_rpc`(0001/0002 필요). 어기면 실패.

   **방법 A — SQL Editor (권장, 현재 CLI 미초기화):**
   Dashboard → SQL Editor → 0001 → 0002 → 0003 파일 내용을 차례로 붙여넣고 RUN.

   **방법 B — Supabase CLI:**
   ```bash
   supabase init                       # config.toml 생성(최초 1회 — 아직 없음)
   supabase link --project-ref <ref>   # 대시보드 URL 의 프로젝트 ref
   supabase db push                    # migrations/ 를 순서대로 적용
   ```

3. 적용 검증(SQL Editor):
   - 테이블 4: `riders / rider_accounts / sla_snapshots / rider_hourly_stats`
   - RLS 활성: `select relname, relrowsecurity from pg_class where relname in ('riders','rider_accounts','sla_snapshots','rider_hourly_stats');` → 모두 `t`
   - RPC grant: `bind_rider_by_phone`(service_role 전용), `get_rider_summary/daily/hourly`(authenticated)

4. Auth — 카카오 간편로그인(`signInWithKakao`):
   Dashboard → Authentication → Providers → **Kakao** 활성 → 카카오 앱의 REST API 키 /
   Client Secret 입력(= `.env.example` 의 `KAKAO_REST_API_KEY/CLIENT_SECRET`).
   ⚠️ 이 두 키는 **Vercel env 아님** — Supabase 대시보드에 넣는다.
   카카오 개발자콘솔 Redirect URI 에 `https://<project>.supabase.co/auth/v1/callback` 등록.

## Vercel — 웹앱 배포

루트 Next.js 16 앱만 배포한다(스크래퍼 `scraper/` 는 Railway 담당 — Vercel 빌드 대상 아님).

1. New Project → `Plattlnc/jangboooo` 임포트.
2. **Framework Preset = Next.js** 확인(자동감지되나 **반드시 확인** — preset 어긋나면 빌드 실패 이력 있음).
   **Root Directory = `./` (repo 루트)** — ⚠️ Railway(=`scraper`)와 다름. Build=`next build`, Install=`npm install`(기본).
   루트 `vercel.json` 이 `framework: nextjs` 를 고정한다.
3. **Environment Variables**(Settings) — 매트릭스 웹 컬럼(✅) 입력:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `IDENTITY_VERIFY_PROVIDER=kakao`,
   `KAKAO_IDENTITY_CLIENT_ID/SECRET/REDIRECT_URI`.
   - 각 변수의 Environment(Production/Preview/Development) 범위 지정.
   - `NEXT_PUBLIC_*` 는 **빌드타임 인라인** → 값 변경 시 재배포 필요.
4. 첫 배포 후 도메인 확정 → **도메인 의존 값 갱신 후 재배포**:
   - `NEXT_PUBLIC_SITE_URL` = 배포 도메인.
   - `KAKAO_IDENTITY_REDIRECT_URI` = `https://<도메인>/...`(본인확인 콜백) → 카카오 개발자콘솔에도 등록.
   - (카카오 **로그인** Redirect 는 Supabase 도메인 기준 → 배포 도메인 무관.)

## 배포 체크리스트

**사전(키 주입 전):**
- [ ] Supabase 프로젝트 생성 + 마이그레이션 0001→0002→0003 적용·검증
- [ ] 카카오 개발자 앱: 로그인용(Supabase Provider) + 본인확인용 키/동의항목(phone_number)
- [ ] Vercel 프로젝트 임포트(Framework=Next.js, Root=루트)

**배포:**
- [ ] Vercel 웹 env 입력 → 배포 → 도메인 확정
- [ ] `NEXT_PUBLIC_SITE_URL` / `KAKAO_IDENTITY_REDIRECT_URI` 도메인 반영 → 재배포 → 카카오 콘솔 등록
- [ ] Railway 워커(스크래퍼)는 위 `## Railway` 절 참조(별도 타깃)

**사후 검증:**
- [ ] `/login` 카카오 로그인 → `/api/auth/callback` 정상
- [ ] 본인확인 → `bind_rider_by_phone` 바인딩(운영 전 `IDENTITY_VERIFY_SANDBOX` 제거 확인)
- [ ] 대시보드 SLA 조회 RLS(본인 데이터만). 데이터 없으면 스크래퍼 적재 후 재확인
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 가 클라이언트 번들에 없는지(브라우저 devtools) 확인

## 데모 접근성 (카카오 로그인 미동작 시)

`/dashboard` 가드는 **Supabase env 유무로 자동 분기**된다(`src/middleware.ts`):

| Supabase env | `/dashboard` 가드 | 데이터 | 데모 |
|--------------|------------------|--------|------|
| **미설정** | 비활성 (`NextResponse.next()`) | mock 폴백(`_lib/queries.ts`) | **로그인 없이 접근** — 목 데이터로 화면 데모 가능 |
| **설정** | 활성 — 미인증 시 `/login?next=/dashboard` 리다이렉트 | 실 Supabase | 카카오 로그인 미동작이면 대시보드 **접근 불가**(우회 없음) |

**첫 배포 권장(카카오 미비 시):**
- ⓐ Supabase env **없이** 먼저 배포 → 로그인 불필요·목 데이터로 UI 데모 → 카카오·DB 준비되면 env 채워 실데이터 자동 전환. (단 env 없으면 SLA 실데이터·본인인증은 동작 안 함.)
- ⓑ 또는 카카오 로그인 먼저 검증 후 env 포함 배포.
- 가드 완화(미인증 허용)는 인증 로직 변경 → frontend/backend 영역. 데모용 임시 우회는 별도 합의 필요(devops 임의 변경 안 함).

## 로컬 개발

- 웹: 루트에서 `.env.local` 사용(Node 20+ `--env-file` 또는 Next 기본 로딩).
- 워커: `scraper/.env`(= `scraper/.env.example` 복사) 후 `npm run once`.
