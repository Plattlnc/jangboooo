# scraper — 라이더 SLA 1분 스크래퍼 (Railway)

웹앱과 독립된 Node 워커. 관리자 포털(grider) 세션을 유지한 채 1분 주기로
라이더 SLA 데이터를 수집해 Supabase 에 멱등 적재한다. **backend + devops 공동 소유.**

- 런타임: Node 20+ · Playwright(헤드리스 크롬) · TypeScript(tsx 실행)
- 호스팅: Railway (24h 상주, `SCRAPE_INTERVAL_SECONDS` 주기)
- 적재: Supabase **service_role**(RLS 우회) — 절대 클라이언트 노출 금지
- 멱등 키(upsert onConflict, `supabase/migrations/0001_core_schema.sql` 기준):
  - `riders` → `admin_rider_id`
  - `sla_snapshots` → `(admin_rider_id, snapshot_date)`
  - `rider_hourly_stats` → `(admin_rider_id, snapshot_date, hour)`

> `snapshot_date` 는 `SCRAPE_TIMEZONE`(기본 Asia/Seoul) 기준 영업일.
> `captured_at` 은 적재 시점(신선도 추적용)으로 멱등 키가 아니다.

## 구조

```
src/
  index.ts        엔트리포인트(부팅·그레이스풀 종료·--once/루프 분기)
  config.ts       env 로딩/검증(zod)
  logger.ts       의존성 없는 JSON 구조화 로거
  scheduler.ts    자기보정 1분 루프(겹침 방지)
  retry.ts        지수 백오프 재시도
  scrape.ts       한 사이클: 세션→수집→멱등 upsert
  browser.ts      Playwright 세션(storageState 영속·재사용)
  supabase.ts     service_role 클라이언트 + upsert 헬퍼
  types.ts        적재 페이로드 타입(0001 스키마 1:1)
  util.ts         TZ 영업일·abort 가능 delay
  sources/grider.ts  ★ 사이트 어댑터(로그인/파서) — 인증 샘플 대기 TODO
```

## 골격 모드 (현재 상태)

`ADMIN_PORTAL_URL / ID / PASSWORD` 중 하나라도 비면 **골격 모드**로 동작:
워커는 정상 기동·상주하되 수집을 스킵하고 그 사실을 로깅한다. 덕분에 자격증명·
셀렉터 확정 전에도 Railway 배포/상주 동작을 검증할 수 있다.

채워야 완성되는 부분(인증 샘플 = 실제 URL·로그인 폼·SLA 테이블 마크업 도착 후):
- `src/sources/grider.ts` 의 `isLoggedIn` / `ensureLoggedIn`(로그인 폼 셀렉터)
- `src/sources/grider.ts` 의 `fetchSlaData`(테이블/네트워크 응답 → `ScrapeResult` 매핑)

해당 지점은 `// TODO(auth-sample):` 로 표시되어 있고, 그 전엔 `NotImplementedError`
를 던져 사이클이 안전하게 스킵된다(재시도하지 않음).

## 로컬 실행

```bash
cd scraper
npm install                 # postinstall 로 chromium 자동 설치
cp .env.example .env        # 값 채우기(.env 는 커밋 금지)
npm run once                # 1회 실행(개발/점검)
npm run dev                 # watch 모드 상주
npm run typecheck           # tsc --noEmit
```

## 배포

Railway · 환경 변수 전체 가이드는 [`docs/env-setup.md`](../docs/env-setup.md) 참조.
