# 배민커넥트비즈 (deliverycenter) — 스크래핑 소스 계약

> CTO가 Chrome 확장으로 로그인 세션에서 직접 확인한 실제 API 구조 (2026-06-28).
> 소스 변경: grider → **배민 사장님사이트/배달대행관제(deliverycenter)**.

## 접속 / 인증
- 포털: `https://deliverycenter.baemin.com` (React SPA, Vite 번들). 로그인은 `biz-member.baemin.com` (ID/PW + **SMS 2FA**, "자동로그인" 체크 옵션 있음).
- **데이터 API 호스트**: `https://api-deliverycenter.baemin.com`
- 인증: **세션 쿠키(.baemin.com) + 협력사 ID**. SPA가 API 호출 시 협력사 ID를 헤더로 주입(직접 fetch 시 `"협력사 아이디는 필수입니다" BAD_REQUEST`). 협력사 = `DP2504250236` (UI 표기 "인천서구8B(DP2504250236)", 주식회사 바로고).
- ⚠️ **인증 토큰 값은 추출하지 않음**(보안). 스크래퍼는 **로그인 세션(storageState)으로 SPA를 띄워 SPA 자신이 인증 호출하게 하고 그 응답을 가로채는** 방식 권장 → 토큰/헤더 수작업 불필요.

## 핵심 엔드포인트
```
GET https://api-deliverycenter.baemin.com/v4/management/delivery-status
    ?page=0&size=20&orderName=name&orderBy=asc&name=&userId=&phoneNumber=&riderStatus=
→ 200, 협력사 소속 전체 라이더의 "배달현황" (오늘 기준 집계로 추정 — 일자 파라미터 미확인)
```
- 페이지네이션: `page` / `size` / `total`(=142) / `totalPage`(=8). **size 크게(예 200) 주면 1콜로 전체** 가능성 높음(검증 필요).
- 화면 경로: `/delivery/history`. 좌측 메뉴에 `달성현황(beta)`, `일별 배달내역`, `라이더별 배달내역` 등 추가 소스 존재(SLA 점수/일자별 이력은 거기일 수 있음 — 추후 탐색).

## 응답 구조
```jsonc
{
  "deliveryStatusTotalResponse": {   // 합계 행(조직 전체)
    "totalCount": 142,
    "totalFoodCompleted","totalBmartCompleted","totalStoreCompleted","totalCompleted",
    "totalFoodRejected","totalBmartRejected","totalStoreRejected","totalRejected",
    "totalFoodCanceled","totalBmartCanceled","totalStoreCanceled","totalCanceled",        // 배차취소
    "totalFoodRiderFault","totalBmartRiderFault","totalStoreRiderFault","totalRiderFault", // 배달취소(라이더귀책)
    "totalMorningCompleted","totalLunchCompleted","totalDinnerCompleted","totalNightCompleted",
    "totalHourlyCompleted"
  },
  "page": 0, "size": 20, "total": 142, "totalPage": 8,
  "data": [
    {
      "phoneNumber": "010-5676-8836",
      "userId": "ngoctay99",                 // ← admin_rider_id (라이더 고유 식별자)
      "name": "NGUYENTHINGOC",
      "status": { "code": "READY", "desc": "운행 종료" },   // 운행상태
      "deliveryAcceptanceCount": {
        "foodComplete","bmartComplete","storeComplete","totalComplete",   // 완료
        "foodReject","bmartReject","storeReject","totalReject",           // 거절
        "foodCancel","bmartCancel","storeCancel","totalCancel",           // 배차취소
        "foodRiderFault","bmartRiderFault","storeRiderFault","totalRiderFault" // 배달취소(라이더귀책)
      },
      "deliveryPeakTimeCount": { "morning","afternoon","evening","midnight" }, // 피크: 아침점심/오후논피크/저녁/심야
      "hourlyCompleted": [ {"hour":0,"count":0}, {"hour":1,"count":0}, ... ]    // 시간대별 완료 (6시~5시 표기, hour 0~23)
    }
  ]
}
```

## 우리 스키마 매핑 (backend)
| 우리 컬럼 | 배민 JSON |
|-----------|-----------|
| `riders.admin_rider_id` | `userId` |
| `riders.name` / `phone` | `name` / `phoneNumber` |
| `sla_snapshots.completed` | `deliveryAcceptanceCount.totalComplete` |
| `sla_snapshots.rejected` | `.totalReject` |
| `sla_snapshots.dispatch_canceled` | `.totalCancel` (배차취소) |
| `sla_snapshots.delivery_canceled` | `.totalRiderFault` (배달취소 라이더귀책) |
| `sla_snapshots.assigned` | 합 = complete+reject+cancel+riderFault (정의 확정 필요) |
| `sla_snapshots.acceptance_rate` | **계산**: totalComplete / (totalComplete+totalReject+totalCancel) ×100 (산식 확정 필요) |
| `sla_snapshots.sla_score` | **API에 없음** → 계산 or 달성현황(beta) 별도 수집 (결정 필요) |
| `rider_hourly_stats(hour,count)` | `hourlyCompleted[]` |
| 피크(morning/afternoon/evening/midnight) | `deliveryPeakTimeCount` → 스키마에 추가 or jsonb (결정 필요) |
| 푸드/비마트/배민스토어 세부 | 현재 스키마엔 합계만 — 세부 보존 원하면 컬럼/jsonb 추가 |

## 확정 (backend Task #17)

매퍼: **`scraper/src/sources/baemin-map.ts`** (`mapDeliveryStatus(rows, snapshotDate)` → `ScrapeResult{riders, snapshots, hourly}`). 응답 타입: `scraper/src/sources/baemin-types.ts`. 스키마 보강: `supabase/migrations/0004_baemin_mapping.sql`, 앱측 row 타입: `src/types/database.ts`.
> 매핑 로직은 **스크래퍼(독립 앱)에서만 실행**되므로 매퍼는 scraper/ 에 단일 구현으로 둔다(Next 앱은 배민 API 미접근). 본 문서가 두 영역의 SSOT.

| 항목 | 확정 |
|------|------|
| `assigned` | `totalComplete + totalReject + totalCancel + totalRiderFault` (배차 제안 총량) |
| `acceptance_rate`(수락률) | `(assigned - totalReject) / assigned × 100`. assigned=0 → null. **기존 `get_rider_summary` 기간 산식과 일치 → RPC 변경 없음** |
| `sla_score` | **잠정** `totalComplete / assigned × 100`(완료율 기반). assigned=0 → null. 달성현황(beta) 실점수 확보 시 교체 |
| 피크 4버킷 | `sla_snapshots.peak_morning/afternoon/evening/midnight` 컬럼 추가(0004). 시간(0~23)은 `rider_hourly_stats` 별도 보존 |
| 푸드/비마트/스토어 세부 | `sla_snapshots.breakdown` jsonb 로 원본 보존(0004). 합계는 기존 컬럼이 핫패스 |

> 참고: `acceptance_rate` 분모에서 `totalCancel`을 제외하지 않고 포함한 이유 — 배차취소/배달취소는 모두 "수락 후" 발생(거절만 미수락)으로 보아 `수락=제안-거절`로 정의. 배민 실제 정의가 다르면 매퍼 산식만 교체(스키마/RPC 불변).

## 미해결 (devops·CTO 트랙)
1. ~~**일자/기간**~~ **확정(CTO 브라우저 검증)**: 배달현황 화면에 **날짜 선택기 없음**(필터=이름/아이디/휴대폰/운행상태뿐), API에 일자 파라미터 없음 → **"오늘 누적"(서버 기본, 영업일 리셋)**. 스크래퍼는 `snapshotDate = 캡처시점 KST 영업일` 주입, 1분마다 같은 날 row upsert(최신 누적 덮어쓰기). (과거 일자별 이력이 필요하면 `일별 배달내역` 메뉴 별도 탐색 — MVP 범위 밖)
2. **size 상한**: size=200 한 콜로 전체(142명) 되는지 검증(devops #18).
3. **SLA 실점수**: 달성현황(beta)/라이더별 배달내역에서 실제 SLA 점수·일자별 이력 확보 가능한지 추가 탐색 → 확보 시 `sla_score` 잠정식 교체.
4. **운행상태**(`status.code/desc`)·페이지네이션 처리는 스크래퍼 어댑터(#18)에서.
