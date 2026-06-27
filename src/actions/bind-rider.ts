'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyIdentity, IdentityError, type VerifiedIdentity } from '@/lib/identity/verify'
import { bindRiderSchema, type BindRiderResult } from '@/types/api'

// Postgres errcode → 바인딩 에러코드 매핑
function mapBindError(message: string): BindRiderResult {
  const m = message || ''
  if (m.includes('RIDER_NOT_FOUND'))
    return { ok: false, code: 'RIDER_NOT_FOUND', message: '명단에서 휴대폰을 찾을 수 없습니다.' }
  if (m.includes('RIDER_ALREADY_BOUND'))
    return { ok: false, code: 'RIDER_ALREADY_BOUND', message: '이미 다른 계정에 연결된 라이더입니다.' }
  if (m.includes('INVALID_PHONE'))
    return { ok: false, code: 'INVALID_PHONE', message: '휴대폰 형식이 올바르지 않습니다.' }
  return { ok: false, code: 'UNKNOWN', message: m || '바인딩에 실패했습니다.' }
}

/**
 * 카카오 로그인 사용자를 본인인증된 휴대폰으로 라이더에 바인딩.
 * 플로우: 세션 확인 → 본인인증 토큰 검증(인증 휴대폰 확보) → service_role RPC 로 매칭/바인딩.
 */
export async function bindRider(input: unknown): Promise<BindRiderResult> {
  const parsed = bindRiderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'VERIFY_FAILED', message: '잘못된 요청입니다.' }
  }

  // 1) 로그인 세션 확인
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' }

  // 2) 본인인증 검증 → 인증된 휴대폰
  let identity: VerifiedIdentity
  try {
    identity = await verifyIdentity(parsed.data.verificationToken)
  } catch (e) {
    if (e instanceof IdentityError) return { ok: false, code: e.code, message: e.message }
    return { ok: false, code: 'VERIFY_FAILED', message: '본인인증에 실패했습니다.' }
  }

  // 3) service_role 로 바인딩 RPC (riders 명단 매칭은 RLS 우회 필요)
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('bind_rider_by_phone', {
    p_user_id: user.id,
    p_phone: identity.phone,
    p_verify_provider: identity.provider,
  })
  if (error) return mapBindError(error.message)

  return { ok: true, adminRiderId: data.admin_rider_id }
}
