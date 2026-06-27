/**
 * API 계약(프론트 ↔ 백엔드 공유 DTO + Zod 스키마).
 * 규칙: `any` 금지, 경계는 Zod 로 검증.
 */
import { z } from 'zod'
import type {
  RiderDailyRow,
  RiderHourlyRow,
  RiderSummaryRow,
  SlaPeriod,
} from '@/types/database'

// ── 공통 ─────────────────────────────────────────────────────
export const slaPeriodSchema = z.enum(['today', 'week', 'month'])

/** GET /api/sla 쿼리 파라미터 */
export const slaQuerySchema = z.object({
  period: slaPeriodSchema.default('today'),
  /** 기준일(YYYY-MM-DD). 생략 시 서버가 KST 오늘로 계산 */
  ref: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'ref must be YYYY-MM-DD')
    .optional(),
})
export type SlaQuery = z.infer<typeof slaQuerySchema>

/** GET /api/sla 응답: 요약 + 일별 + 시간대 한 번에 */
export interface SlaDashboardResponse {
  period: SlaPeriod
  summary: RiderSummaryRow
  daily: RiderDailyRow[]
  hourly: RiderHourlyRow[]
}

// ── 바인딩 ───────────────────────────────────────────────────
/**
 * 본인인증 바인딩 요청.
 * 클라이언트는 본인인증 위젯에서 받은 검증 토큰을 전달.
 * 서버가 토큰을 제공사 API 로 검증 → 인증된 휴대폰 확보 → 바인딩.
 * (휴대폰을 클라이언트가 직접 보내지 않는다 — 위변조 방지)
 */
export const bindRiderSchema = z.object({
  verificationToken: z.string().min(1, 'verificationToken required'),
})
export type BindRiderInput = z.infer<typeof bindRiderSchema>

export type BindErrorCode =
  | 'AUTH_REQUIRED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'VERIFY_FAILED'
  | 'INVALID_PHONE'
  | 'RIDER_NOT_FOUND'
  | 'RIDER_ALREADY_BOUND'
  | 'UNKNOWN'

export type BindRiderResult =
  | { ok: true; adminRiderId: string }
  | { ok: false; code: BindErrorCode; message: string }

// ── 바인딩 상태 ──────────────────────────────────────────────
export interface BindingStatus {
  bound: boolean
  adminRiderId: string | null
  riderName: string | null
}

/** API 에러 응답 공통 형태 */
export interface ApiError {
  error: { code: string; message: string }
}
