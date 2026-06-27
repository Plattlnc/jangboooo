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

## 3. 인증 & 바인딩 플로우
```
카카오 로그인(signInWithKakao) → /api/auth/callback (code 교환)
  → 세션 생성 → 본인인증(휴대폰) 토큰 → bindRider({verificationToken})
  → verifyIdentity(token) = 인증 휴대폰 → bind_rider_by_phone(service_role)
  → riders.phone_norm 매칭 → rider_accounts 바인딩
```
- 카카오 로그인: `signInWithKakao(next?)` — `src/lib/supabase/auth.ts` (클라이언트)
- 콜백: `GET /api/auth/callback?code=&next=` — 세션 교환 후 `next` 로 redirect, 실패 시 `/login?error=auth`
- 바인딩: server action `bindRider(input)` — `src/actions/bind-rider.ts`
- 바인딩 상태: `getBindingStatus(supabase)` → `{ bound, adminRiderId, riderName }`

### 본인인증 = 카카오 본인확인 (확정)
- 어댑터: `src/lib/identity/verify.ts` (`verifyIdentity(token)` → `VerifiedIdentity{phone, provider, name?, ci?}`).
- `verificationToken` = **카카오 본인확인 authorization code**. 서버가 code→token 교환(`kauth.kakao.com/oauth/token`) 후 `kapi.kakao.com/v2/user/me` 로 검증 휴대폰 조회 → 국내 정규화(01012345678) → `bind_rider_by_phone`.
- env: `IDENTITY_VERIFY_PROVIDER=kakao`, `KAKAO_IDENTITY_CLIENT_ID/SECRET/REDIRECT_URI`. 미설정 시 `PROVIDER_NOT_CONFIGURED` 안전차단(카카오 **로그인**은 동작).
- 개발/테스트: `IDENTITY_VERIFY_SANDBOX=true`(비운영) + 토큰 `mock:01012345678` 우회 가능.
- ⚠️ 카카오 본인확인 키/동의항목(phone_number) 미발급 상태일 수 있음 — 발급 후 env만 채우면 동작.

## 4. 집계 API

### Route Handler
`GET /api/sla?period=today|week|month&ref=YYYY-MM-DD`
- 인증 필요(미로그인 401). `period` 기본 `today`, `ref` 생략 시 KST 오늘.
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

### 직접 호출 헬퍼 (서버 컴포넌트 권장) — `src/lib/supabase/queries.ts`
```ts
import { createClient } from '@/lib/supabase/server'
import { getDashboard } from '@/lib/supabase/queries'
const supabase = await createClient()
const data = await getDashboard(supabase, 'week') // {period, summary, daily, hourly}
```
개별: `getRiderSummary / getRiderDaily / getRiderHourly(supabase, period, ref?)`.

### 기간 정의 (KST)
- today: 당일 / week: 이번 주(월요일~기준일) / month: 이번 달 1일~기준일.

### 집계 규칙 (가정 — 원본 의미 확정 시 조정)
- 카운트(completed/rejected/dispatch_canceled/delivery_canceled/assigned): 기간 **합산**.
- `sla_score` 기간값: 완료건 **가중평균**(완료 0이면 단순평균).
- `acceptance_rate` 기간값: `assigned>0` 이면 `(assigned-rejected)/assigned*100`, 아니면 일별 원본 평균. **단위 0~100(%)**.

## 5. 타입 위치
- `src/types/database.ts`: `Database`(Supabase 제네릭), Row/RPC 타입, `SlaPeriod`.
- `src/types/api.ts`: `slaQuerySchema`/`bindRiderSchema`(Zod), `SlaDashboardResponse`, `BindRiderResult`, `BindingStatus`, `BindErrorCode`.

### BindErrorCode
`AUTH_REQUIRED | PROVIDER_NOT_CONFIGURED | VERIFY_FAILED | INVALID_PHONE | RIDER_NOT_FOUND | RIDER_ALREADY_BOUND | UNKNOWN`

## 6. 프론트 연동 시 주의
- 응답 필드는 **snake_case**, `acceptance_rate`/`sla_score` 는 **0~100 퍼센트**.
- SSR 세션 갱신을 위해 루트 `src/middleware.ts`(또는 proxy)에서 `updateSession(request)`(`src/lib/supabase/middleware.ts`) 호출 필요.
- `hourly` 는 항상 24개 버킷 → 피크시간대 차트에 그대로 사용.

## 7. 적용 상태
마이그레이션 작성 완료, **실 Supabase 프로젝트 적용은 미수행**(env/프로비저닝 = devops). 적용 순서: 0001 → 0002 → 0003.
