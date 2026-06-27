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

// ── 라이더 로그인 (ID + 비번=휴대폰 뒤4자리) ──────────────────
export const signInRiderSchema = z.object({
  /** 관리시스템 라이더 고유 ID (admin_rider_id) */
  riderId: z.string().trim().min(1, 'riderId required'),
  /** 비밀번호 = 등록 휴대폰 뒤 4자리(숫자 4자리) */
  password: z.string().regex(/^\d{4}$/, 'password must be 4 digits'),
})
export type SignInRiderInput = z.infer<typeof signInRiderSchema>

export type SignInErrorCode =
  | 'INVALID_INPUT'
  | 'RIDER_NOT_FOUND'
  | 'INVALID_PASSWORD'
  | 'SERVER_ERROR'

export type SignInResult =
  | { ok: true; adminRiderId: string; name: string | null }
  | { ok: false; code: SignInErrorCode; message: string }

/** API 에러 응답 공통 형태 */
export interface ApiError {
  error: { code: string; message: string }
}
