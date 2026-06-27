/**
 * 배민 deliverycenter `delivery-status` 응답 타입.
 * 계약: docs/api/baemin-source.md (CTO 가 실세션에서 확인, 2026-06-28).
 * GET https://api-deliverycenter.baemin.com/v4/management/delivery-status
 *
 * 주의: 배민이 필드를 추가/변경할 수 있어 모든 카운트는 선택적으로 두고
 *       매핑(baemin-map.ts)에서 안전하게 0 폴백한다.
 */

/** 라이더별 배달 수락/완료 카운트. */
export type DeliveryAcceptanceCount = {
  foodComplete?: number
  bmartComplete?: number
  storeComplete?: number
  totalComplete?: number
  foodReject?: number
  bmartReject?: number
  storeReject?: number
  totalReject?: number
  foodCancel?: number
  bmartCancel?: number
  storeCancel?: number
  totalCancel?: number // 배차취소
  foodRiderFault?: number
  bmartRiderFault?: number
  storeRiderFault?: number
  totalRiderFault?: number // 배달취소(라이더귀책)
}

/** 피크 시간대 완료 분포. */
export type DeliveryPeakTimeCount = {
  morning?: number
  afternoon?: number
  evening?: number
  midnight?: number
}

export type HourlyCompleted = {
  hour: number // 0~23
  count: number
}

/** data[] 한 행 = 라이더 1명. */
export type DeliveryStatusRow = {
  phoneNumber?: string
  userId: string // ← admin_rider_id
  name?: string
  status?: { code?: string; desc?: string }
  deliveryAcceptanceCount?: DeliveryAcceptanceCount
  deliveryPeakTimeCount?: DeliveryPeakTimeCount
  hourlyCompleted?: HourlyCompleted[]
}

/** 조직 전체 합계 행(현재 적재 안 함 — 검증/로깅용). */
export type DeliveryStatusTotalResponse = {
  totalCount?: number
  totalCompleted?: number
  totalRejected?: number
  totalCanceled?: number
  totalRiderFault?: number
}

/** delivery-status 응답 전체. */
export type DeliveryStatusResponse = {
  deliveryStatusTotalResponse?: DeliveryStatusTotalResponse
  page: number
  size: number
  total: number
  totalPage: number
  data: DeliveryStatusRow[]
}
