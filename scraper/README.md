# scraper — 관리자 페이지 1분 스크래퍼 (Railway)

별도 Node 워커. 관리자 계정 세션을 유지한 채 1분마다 라이더 SLA 데이터를 수집해 Supabase 에 적재한다.

- 런타임: Node + Playwright (헤드리스 크롬)
- 호스팅: Railway (24h 상주, `SCRAPE_INTERVAL_SECONDS` 주기)
- 적재 대상: Supabase (service role 키 사용, RLS 우회)
- 멱등성: `(admin_rider_id, captured_at)` 기준 upsert

## 미확정 (구현 전 필요)
- 관리자 소스 시스템 URL / 로그인 방식 / 데이터 위치(DOM/네트워크 응답)

> 이 디렉토리는 웹앱과 독립된 package.json 을 갖는다. backend + devops 공동 소유.
