# jangboooo — 라이더 개인 SLA 대시보드

> 모든 teammate 가 공유하는 단일 진실 소스(SSOT). 작업 전 반드시 읽는다.

## 무엇을 만드나

배달 라이더 관리시스템(관리자 전용)의 데이터를 **라이더 개인이 본인 것만** 보는 대시보드.
지표: SLA 점수, 완료/거절/배차취소/배달취소, 수락률, 피크시간대 실적. 기간: 오늘 / 이번 주 / 이번 달.

## 아키텍처 (3 트랙)

```
[관리자 페이지] ──1분 스크래핑──▶ [Supabase DB] ──RLS 조회──▶ [라이더 개인 대시보드]
   스크래퍼(Railway)              라이더별/날짜별 누적         Next.js 16, 본인 데이터만
   Node + Playwright, 24h 세션유지
```

## 확정 결정 (2026-06-28)

| 항목 | 결정 |
|------|------|
| 웹 스택 | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 |
| DB/인증 | Supabase (Postgres + Auth + RLS) |
| 라이더 로그인 | **카카오 간편로그인 + 본인인증(휴대폰)** |
| 라이더 식별키 | **관리시스템 라이더 고유 ID** (`admin_rider_id`) |
| 계정-데이터 연결 | 본인인증 휴대폰 → admin 명단의 휴대폰 매칭 → `admin_rider_id` 바인딩 |
| 스크래퍼 호스팅 | **Railway** (Node + Playwright), 1분 주기 |

## 미해결 (사용자 확인 필요)

- 관리자 소스 시스템 정체: URL / 로그인 방식 / 데이터 구조 → **스크래퍼 구현 전 필수**

## 파일 소유권 (충돌 방지)

| 영역 | 소유자 | 경로 |
|------|--------|------|
| 디자인 시스템·명세 | uxui | `design/`, `docs/design/`, `src/styles/`, `tailwind.config.*` |
| 브랜딩·카피·SEO | cmo | `docs/brand/`, `docs/marketing/` |
| DB·API·인증·RLS | backend | `src/app/api/`, `src/actions/`, `src/lib/supabase/`, `src/types/`, `supabase/migrations/` |
| UI·페이지·연동 | frontend | `src/app/(pages)`, `src/components/` |
| 스크래퍼 | backend + devops | `scraper/` |
| 테스트 | qa | `tests/` |
| CI/CD·배포·env | devops | `.github/workflows/`, `.env.example`, `docs/env-setup.md`, `railway.*` |

## 규칙

- TypeScript 필수, `any` 금지, Zod 검증.
- 전 테이블 RLS 적용. service role 키는 서버/스크래퍼 전용.
- 시크릿 하드코딩 금지 — `.env.example` 만 커밋.
- main 직접 push 금지(스캐폴드 제외). 각자 worktree 브랜치에서 작업 후 PR.
- 같은 파일 동시 수정 금지 — 위 소유권 표 준수.
