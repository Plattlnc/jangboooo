@AGENTS.md

# jangboooo

라이더 개인 SLA 대시보드. 전체 브리프·아키텍처·결정·파일 소유권은 **`docs/PROJECT.md`** 참조 (작업 전 필독).

## 스택
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (Auth/Postgres/RLS) · 스크래퍼는 Railway + Playwright.

## 규칙
- `any` 금지, Zod 검증, 전 테이블 RLS.
- 시크릿 하드코딩 금지. service role 키는 서버/스크래퍼 전용.
- 파일 소유권(docs/PROJECT.md) 준수 — 같은 파일 동시 수정 금지.
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
