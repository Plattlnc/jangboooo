# scraper — 라이더 SLA 1분 스크래퍼 (Railway)

웹앱과 독립된 Node 워커. **배민 deliverycenter** 로그인 세션을 유지한 채 1분 주기로
라이더 배달현황을 수집해 Supabase 에 멱등 적재한다. **backend + devops 공동 소유.**

- 런타임: Node 20+ · Playwright(헤드리스 크롬) · TypeScript(tsx 실행)
- 호스팅: Railway (24h 상주, `SCRAPE_INTERVAL_SECONDS` 주기)
- 적재: Supabase **service_role**(RLS 우회) — 절대 클라이언트 노출 금지
- 멱등 키(upsert onConflict):
  - `riders` → `admin_rider_id`
  - `sla_snapshots` → `(admin_rider_id, snapshot_date)`
  - `rider_hourly_stats` → `(admin_rider_id, snapshot_date, hour)`

> `snapshot_date` 는 `SCRAPE_TIMEZONE`(기본 Asia/Seoul) 기준 영업일.
> `captured_at` 은 적재 시점(신선도 추적용)으로 멱등 키가 아니다.

## 소스 시스템 (배민 deliverycenter)

계약 SSOT: [`docs/api/baemin-source.md`](../docs/api/baemin-source.md).
- 포털: `https://deliverycenter.baemin.com` (React SPA). 로그인 `biz-member.baemin.com`(ID/PW + **SMS 2FA**).
- 데이터 API: `https://api-deliverycenter.baemin.com/v4/management/delivery-status` (협력사 ID 헤더는 **SPA 가 주입** → 직접 fetch 불가).
- **방식: 토큰 추출 없이**, 로그인 세션(storageState)으로 SPA 를 띄워 SPA 자신이 인증
  호출하게 하고 그 `delivery-status` **응답(JSON)을 가로채** 매핑한다. `?size=200` 1콜
  시도 → 서버 상한이면 페이지 루프 폴백.

## 세션 캡처 (필수 선행)

SMS 2FA 때문에 무인 로그인이 불가하다. **로컬에서 사람이 1회 로그인**해 세션을 만든다:

```bash
cd scraper
npm install
npm run capture            # headed 브라우저 → biz-member 로그인(2FA, 자동로그인 체크) → ENTER
```

→ `STORAGE_STATE_PATH`(기본 `./.session/storage-state.json`)에 세션 저장 + Railway 용
`STORAGE_STATE_B64`(base64 한 줄) 출력. 세션 만료 시 재실행해 갱신.
워커는 이 파일(또는 `STORAGE_STATE_B64` env)로 SPA 를 띄운다. 만료 감지 시
`재로그인 필요` 로깅 후 해당 사이클만 스킵(상주는 유지).

## 3가지 동작 모드

| 모드 | 조건 | 동작 |
|------|------|------|
| **골격** | `ADMIN_PORTAL_URL` 미설정 | 상주만, 수집 스킵(로깅). 배포/상주 검증용 |
| **MOCK** | `SCRAPE_MOCK=true` | 배민 미접속, mock → Supabase 적재 파이프라인 end-to-end 검증(**운영 금지**) |
| **실수집** | URL 설정 + 비-mock + 유효 세션 | SPA 인터셉트 → 매핑 → 멱등 upsert |

## 구조

```
src/
  index.ts            엔트리포인트(부팅·세션 B64 복원·--once/루프·그레이스풀 종료)
  config.ts           env 로딩/검증(zod)
  logger.ts           의존성 없는 JSON 구조화 로거
  scheduler.ts        자기보정 1분 루프(겹침 방지·틱 예산 타임아웃)
  retry.ts            지수 백오프 재시도
  scrape.ts           한 사이클: 세션확인→인터셉트 수집→멱등 upsert(세션만료 스킵)
  browser.ts          Playwright 세션(storageState 영속·재사용)
  supabase.ts         service_role 클라이언트 + upsert 헬퍼
  types.ts            적재 페이로드 타입
  util.ts             TZ 영업일·abort delay·타임아웃
  sources/baemin.ts        ★ 배민 어댑터(세션확인·응답 인터셉트·페이지네이션)
  sources/baemin-types.ts  delivery-status 응답 타입
  sources/baemin-map.ts    delivery-status → ScrapeResult 매핑(산식: backend #17)
scripts/
  capture-session.ts  로컬 1회 세션 캡처(headed)
```

## 로컬 실행

```bash
cd scraper
npm install                 # postinstall 로 chromium 자동 설치
npm run capture             # 세션 1회 캡처(실수집 전 필수)
SCRAPE_MOCK=true npm run once   # 적재 파이프라인만 점검(배민 미접속)
npm run dev                 # watch 모드 상주
npm run typecheck           # tsc --noEmit
```

env(로컬)는 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`ADMIN_PORTAL_URL` 등을
셸이나 `.env`(커밋 금지)로 주입. 전체 목록·배포는 [`docs/env-setup.md`](../docs/env-setup.md).

## 배포

Railway · 환경 변수 전체 가이드는 [`docs/env-setup.md`](../docs/env-setup.md) 참조.
세션은 `STORAGE_STATE_B64`(캡처 출력)로 Railway Variables 에 주입.
