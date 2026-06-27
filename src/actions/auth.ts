'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { setRiderSession, clearRiderSession } from '@/lib/auth/cookies'
import { constantTimeEqual } from '@/lib/auth/session'
import { signInRiderSchema, type SignInResult } from '@/types/api'

/**
 * 라이더 로그인: ID(admin_rider_id) + 비밀번호(등록 휴대폰 뒤 4자리).
 * service_role 로 riders 조회(RLS 우회) → 존재 + 활성 + 뒤4자리 일치(상수시간) 검증 → 서명 세션 쿠키.
 * 에러코드(스펙 #19): 미식별 RIDER_NOT_FOUND / 비번불일치 INVALID_PASSWORD.
 * (참고: 구분 코드는 rider_id 열거를 허용 — 4자리 비번 특성상 본질적 완화책은 레이트리밋.)
 */
export async function signInRider(input: unknown): Promise<SignInResult> {
  const parsed = signInRiderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_INPUT', message: '아이디와 4자리 비밀번호를 확인해주세요.' }
  }
  const { riderId, password } = parsed.data

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, code: 'SERVER_ERROR', message: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  const { data: rider, error } = await admin
    .from('riders')
    .select('admin_rider_id, phone_norm, is_active, name')
    .eq('admin_rider_id', riderId)
    .maybeSingle()
  if (error) {
    return { ok: false, code: 'SERVER_ERROR', message: '일시적인 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  // 식별 불가(미존재/비활성/휴대폰 없음).
  if (!rider || !rider.is_active || !rider.phone_norm) {
    return { ok: false, code: 'RIDER_NOT_FOUND', message: '등록된 라이더를 찾을 수 없습니다.' }
  }
  // 비번 = 휴대폰 뒤 4자리(상수시간 비교).
  if (!constantTimeEqual(password, rider.phone_norm.slice(-4))) {
    return { ok: false, code: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다.' }
  }

  await setRiderSession(rider.admin_rider_id)
  return { ok: true, adminRiderId: rider.admin_rider_id, name: rider.name }
}

/** 로그아웃: 세션 쿠키 제거. */
export async function signOutRider(): Promise<void> {
  await clearRiderSession()
}
