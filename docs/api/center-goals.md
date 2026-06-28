# 공동목표 달성현황 (center peak goals) — 데이터 계약

> 대시보드 "공동목표 달성현황" 카드용. 출처는 배민커넥트비즈 **달성현황(beta)** =
> 구글 **Looker Studio 임베드 리포트**. (HAR 직접 분석, 2026-06-28.)
> backend SSOT. frontend/designer 는 이 문서의 필드/단위/널 규약을 사용.

## 스코프
- **센터(협력사) 공유** 지표다(라이더 개인 목표 아님). 같은 센터의 모든 라이더가 동일 값을 본다.
- 센터 = 협력사. 예: `DP2504250236`(인천서구8B). 현재 배포는 단일 센터.
- 라이더→센터 매핑: `riders.center_id` (스크래퍼가 delivery-status 의 `center-id` 헤더로 적재).

## 4피크 (표시 순서 고정)
| peak_key | 라벨(디자인) | 소스 필드 | 비고 |
|----------|------------|-----------|------|
| `ml` | 아침점심 | `_value_ml_` | morning+lunch |
| `pl` | 오후논피크 | `_value_pl_` | post-lunch |
| `d`  | 저녁피크 | `_value_d_` | dinner |
| `pd` | 심야논피크 | `_value_pd_` | post-dinner |

> 매핑 확정 근거(추정 아님): batchedDataV2 요청 queryFields 순서 = `_value_ml_ → _value_pl_ → _value_d_ → _value_pd_`,
> getSchema displayName(`value_ml/pl/d/pd`), 디자인(Figma) 라벨 순서가 모두 위 순서로 일치.
> 소스 셀은 이미 `"현재/목표 (퍼센트%)"` 문자열(예 `"810/528 (100%)"`, `"0/560 (0%)"`).

## API (RPC)
`get_center_goals_for(p_admin_rider_id text, p_ref date default null)` — service_role 전용
(앱이 서명세션 검증 후 admin_rider_id 를 넘겨 호출, 기존 `_for` 패턴과 동일).
- 라이더의 센터(`riders.center_id`, 없으면 최신 적재 센터로 폴백) 기준 **항상 4행** 반환(ml→pl→d→pd).
- 기준 영업일: `p_ref` → 없으면 그 센터의 최신 `snapshot_date`.

### 반환 행 (`CenterGoalRow`)
| 필드 | 타입 | 의미 |
|------|------|------|
| `peak_key` | `'ml'\|'pl'\|'d'\|'pd'` | 피크 식별자 |
| `peak_order` | `int` (0~3) | 표시 순서 |
| `label` | `string` | 디자인 라벨(frontend 가 덮어써도 됨) |
| `current` | `int \| null` | 현재 달성(건). 미상 `null` |
| `goal` | `int \| null` | 공동목표(건). 미상/0 → 달성률 없음 |
| `pct` | `int \| null` (0~100) | **소스 표기 퍼센트(100 상한)**. 데이터 없으면 `null` |
| `snapshot_date` | `date \| null` | 기준 영업일 |
| `center_id` | `string \| null` | 센터 ID |

### 표시 규약
- 카드 표기: `현재/목표 (pct%)` 예 `0/336 (0%)`, `336/336 (100%)`.
- **pct 는 소스값을 그대로 사용**(예 810/528 은 153% 아니라 `100`). `current/goal` 로 재계산 금지(>100 발생).
- `null` 처리: `current`/`goal`/`pct` 가 null 인 피크는 데이터 미수집 → `—` 표시 권장.
- 단위: 건수(정수). 퍼센트는 정수.

## 파이프라인 / 운영 의존성
- 스크래퍼(`scraper/src/sources/baemin-goals*.ts`)가 **별도 구글 세션(storageState)** 으로 Looker
  임베드를 띄워 `batchedDataV2` 응답을 가로채 파싱 → `center_peak_goals` upsert.
  배달현황(1분)과 독립된 느린 주기(최소 10분), best-effort(실패해도 배달현황 영향 없음).
- 파서는 **HAR 응답 픽스처로 오프라인 단위테스트**됨(`scraper/tests/goals-parser.test.ts`).
- **구글 세션 만료 시 재캡처 필요**: `cd scraper && npm run capture:google` →
  출력 base64 를 Railway `GOOGLE_STORAGE_STATE_B64` 에 갱신 → 재배포.
  (로그 `공동목표 응답 미확보`/`공동목표 수집/적재 실패` 가 만료 신호.)

## 스키마
- `0006_center_goals.sql`: `riders.center_id` 추가 + `center_peak_goals(center_id, snapshot_date, peak_key, current, goal, pct, center_name, captured_at)` UNIQUE(center_id, snapshot_date, peak_key). 전 테이블 RLS.
- `0007_center_goals_rpc.sql`: RLS 정책 + `get_center_goals_for` (service_role).
