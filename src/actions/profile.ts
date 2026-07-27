'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 내정보 등록/수정: 실 사용자 이름·연락처 + 운행 바이크(번호판, 기종).
 * 세션의 admin_rider_id 본인 행만 갱신(service_role — 대상 행은 세션에서만 결정).
 * 저장값은 ROADING 사고접수 임베드 프리필(name/phone/plate/model)에 사용된다.
 */

const phoneDigits = /^01[016789]\d{7,8}$/

const saveProfileSchema = z.object({
  realName: z.string().trim().max(30, '이름은 30자 이내로 입력해주세요.'),
  realPhone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => v === '' || phoneDigits.test(v), '휴대폰 번호 형식을 확인해주세요.'),
  bikePlate: z.string().trim().max(12, '번호판은 12자 이내로 입력해주세요.'),
  bikeModel: z.string().trim().max(30, '기종은 30자 이내로 입력해주세요.'),
  /** '' | '렌탈' | '리스' */
  usageType: z.enum(['', '렌탈', '리스']),
  /** '' 또는 'YYYY-MM-DD' */
  insuranceStart: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), '보험 시작일 형식을 확인해주세요.'),
  /** '' 또는 기간 일수 문자열 */
  insuranceDays: z
    .string()
    .trim()
    .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), '보험 기간을 확인해주세요.'),
})

export interface SaveProfileResult {
  ok: boolean
  message: string
}

/** 숫자만 → 010-1234-5678 표기로 정규화(입력이 비면 null). */
function formatPhone(digits: string): string | null {
  if (!digits) return null
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return digits
}

export async function saveRiderProfile(input: unknown): Promise<SaveProfileResult> {
  const parsed = saveProfileSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값을 확인해주세요.'
    return { ok: false, message: first }
  }

  const { getRiderSession } = await import('@/lib/auth/cookies')
  const session = await getRiderSession()
  if (!session) {
    return { ok: false, message: '로그인이 만료되었습니다. 다시 로그인해주세요.' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, message: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  const { realName, realPhone, bikePlate, bikeModel, usageType, insuranceStart, insuranceDays } =
    parsed.data
  const { data, error } = await admin
    .from('riders')
    .update({
      real_name: realName || null,
      real_phone: formatPhone(realPhone),
      plate: bikePlate || null,
      bike_model: bikeModel || null,
      usage_type: usageType || null,
      insurance_start: insuranceStart || null,
      insurance_days: insuranceDays ? Number(insuranceDays) : null,
    })
    .eq('admin_rider_id', session.adminRiderId)
    .select('admin_rider_id')

  if (error) {
    return { ok: false, message: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }
  if (!data || data.length === 0) {
    return { ok: false, message: '라이더 정보를 찾을 수 없습니다.' }
  }

  revalidatePath('/myinfo')
  revalidatePath('/roading')
  return { ok: true, message: '내 정보가 저장되었습니다.' }
}
