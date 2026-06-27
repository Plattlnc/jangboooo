# jangboooo — SLA / 인증 API 스펙

> 라이더 개인 SLA 대시보드의 데이터·인증 계약. 소유: backend.
> 구현: `supabase/migrations/0001~0003`, `src/lib/supabase/`, `src/actions/`, `src/app/api/`.
> 식별키: `admin_rider_id` (관리시스템 라이더 고유 ID).

## 1. 데이터 모델

| 테이블 | 용도 | 적재 주체 |
|--------|------|-----------|
| `riders` | 관리시스템 라이더 명단 | 스크래퍼(service_role) upsert |
| `rider_accounts` | 카카오 계정(auth.users) ↔ `admin_rider_id` 1:1 바인딩 | `bind_rider_by_phone` RPC |
| `sla_snapshots` | 라이더별 **영업일별** 누적 실적 | 스크래퍼 1분 upsert |
| `rider_hourly_stats` | 피크시간대(영업일×시간) 실적 | 스크래퍼 1분 upsert |

### 멱등 키 (스크래퍼)
- `sla_snapshots`: **UNIQUE (admin_rider_id, snapshot_date)** — 영업일 1행, 매 스크래핑마다 최신 누적치로 upsert. `captured_at` 으로 신선도 추적.
- `rider_hourly_stats`: **UNIQUE (admin_rider_id, snapshot_date, hour)**.
- `riders`: PK `admin_rider_id`.
- 휴대폰 매칭 키: `riders.phone_norm`(숫자만 정규화, generated column).

> 설계 메모: 스냅샷 키를 (rider, captured_at)이 아니라 **(rider, snapshot_date)** 로 둔 이유 — 매분 행을 쌓으면 일/주/월 집계 시 중복 합산이 발생. "영업일 누적 1행" 모델이 멱등 upsert + 기간 집계 양쪽에 정확. (관리시스템이 시점별 이력 원본을 준다면 변경 가능 — 확정 필요.)

## 2. RLS (전 테이블)
- 라이더(`authenticated`)는 **본인 `admin_rider_id` 행만 SELECT**. 쓰기 정책 없음.
- 본인 판별: `current_admin_rider_id()` = 로그인 user 에 바인딩된 `admin_rider_id`.
- 스크래퍼/서버 액션은 **service_role** 로 RLS 우회 적재.

## 3. 인증 = 라이더 ID/비번 + 서명 세션 (#19, 카카오/본인인증 전면 제거)
```
로그인폼(riderId, password) → signInRider(서버액션)
  → service_role 로 riders 조회(admin_rider_id=riderId)
  → 존재 + is_active + phone_norm 뒤4자리 == password (상수시간 비교)
  → HMAC 서명 httpOnly 쿠키 세션(payload=admin_rider_id) 설정
```
- 비밀번호 = **등록 휴대폰 뒤 4자리(숫자 4자리)**. 비번 비교는 상수시간.
- 로그인: server action `signInRider(input)` — `src/actions/auth.ts`. input `{ riderId, password }`.
  - 결과 `SignInResult`: `{ ok:true, adminRiderId, name }` 또는 `{ ok:false, code, message }`.
  - `SignInErrorCode`: `INVALID_INPUT | RIDER_NOT_FOUND | INVALID_PASSWORD | SERVER_ERROR` (미식별/비번불일치 구분 — #19 스펙).
  - 이름표시: `getRiderName(adminRiderId)` (server-only, service_role).
- 로그아웃: server action `signOutRider()` — 세션 쿠키 삭제.
- 세션:
  - 서명/검증(Edge+Node): `src/lib/auth/session.ts` — `createSessionToken / verifySessionToken / SESSION_COOKIE`. HMAC-SHA256(Web Crypto), `SESSION_SECRET` env(≥16자) 필요.
  - 쿠키 헬퍼(server-only): `src/lib/auth/cookies.ts` — `getRiderSession()`→`{adminRiderId}|null`, `setRiderSession`, `clearRiderSession`.
  - 게이트: `src/middleware.ts` — `/dashboard*` 미인증 시 `/login?next=` 리다이렉트. (DEMO_MODE 또는 SESSION_SECRET 미설정 시 비활성.)
- env: **`SESSION_SECRET`**(서버 전용, ≥16자 랜덤). 카카오/IDENTITY_* 변수는 폐기.

## 4. 집계 API

### Route Handler
`GET /api/sla?period=today|week|month&ref=YYYY-MM-DD`
- 서명 세션 필요(미로그인 401). `admin_rider_id`는 세션에서만 유도(쿼리로 못 받음). `period` 기본 `today`, `ref` 생략 시 KST 오늘.
- 200 응답 `SlaDashboardResponse`:
```ts
{
  period: 'today'|'week'|'month',
  summary: RiderSummaryRow,   // 기간 요약 1건
  daily:   RiderDailyRow[],   // 일별 시계열(snapshot_date asc)
  hourly:  RiderHourlyRow[],  // 0~23시 전 구간(없으면 completed:0)
}
```
- 에러: 400 `{error:{code:'BAD_REQUEST'}}`, 401 `AUTH_REQUIRED`, 500 `QUERY_FAILED`.

### 직접 호출 헬퍼 (서버 전용) — `src/lib/supabase/queries.ts`
admin_rider_id 를 **반드시 검증 세션에서** 얻어 넘긴다(외부 입력 금지). 내부에서 service_role admin 클라이언트로 `*_for` RPC(0005) 호출.
```ts
import { getRiderSession } from '@/lib/auth/cookies'
import { getDashboardFor } from '@/lib/supabase/queries'
const session = await getRiderSession()
if (!session) redirect('/login')
const data = await getDashboardFor(session.adminRiderId, 'week') // {period, summary, daily, hourly}
```
개별: `getRiderSummaryFor / getRiderDailyFor / getRiderHourlyFor(adminRiderId, period, ref?)`.

### 기간 정의 (KST)
- today: 당일 / week: 이번 주(월요일~기준일) / month: 이번 달 1일~기준일.

### 집계 규칙 (가정 — 원본 의미 확정 시 조정)
- 카운트(completed/rejected/dispatch_canceled/delivery_canceled/assigned): 기간 **합산**.
- `sla_score` 기간값: 완료건 **가중평균**(완료 0이면 단순평균).
- `acceptance_rate` 기간값: `assigned>0` 이면 `(assigned-rejected)/assigned*100`, 아니면 일별 원본 평균. **단위 0~100(%)**.

## 5. 타입 위치
- `src/types/database.ts`: `Database`(Supabase 제네릭), Row/RPC 타입(`*_for` 포함), `SlaPeriod`.
- `src/types/api.ts`: `slaQuerySchema`/`signInRiderSchema`(Zod), `SlaDashboardResponse`, `SignInResult`, `SignInErrorCode`.

### SignInErrorCode
`INVALID_INPUT | RIDER_NOT_FOUND | INVALID_PASSWORD | SERVER_ERROR`

## 6. 프론트 연동 시 주의
- 응답 필드는 **snake_case**, `acceptance_rate`/`sla_score` 는 **0~100 퍼센트**.
- 로그인 폼 → `signInRider({riderId, password})`. 성공 시 세션 쿠키 자동 설정 → `/dashboard` 이동. 실패 시 `code`로 안내.
- 대시보드(서버 컴포넌트): `getRiderSession()`로 admin_rider_id 확보 → `getDashboardFor(...)`. 세션 없으면 `/login`.
- 미들웨어가 `/dashboard*` 게이트. (구 `updateSession`/Supabase Auth 세션은 제거됨.)
- `hourly` 는 항상 24개 버킷 → 피크시간대 차트에 그대로 사용.

## 7. 적용 상태
마이그레이션 작성 완료, **실 Supabase 프로젝트 적용은 미수행**(env/프로비저닝 = devops). 적용 순서: 0001 → 0002 → 0003 → 0004 → 0005. 추가 env: `SESSION_SECRET`.
