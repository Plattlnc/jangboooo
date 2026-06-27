'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bindRiderSchema, type BindRiderResult } from '@/types/api'

/**
 * 본인인증 검증 결과.
 * 제공사(PASS/NICE 등) 미확정 → 토큰을 제공사 API 로 검증해 인증 휴대폰을 얻는 단계는
 * 어댑터로 분리. 현재는 미설정 시 명시적 실패(보안상 토큰 우회 금지).
 */
interface VerifiedIdentity {
  phone: string
  provider: string
}

async function verifyIdentity(token: string): Promise<VerifiedIdentity> {
  const provider = process.env.IDENTITY_VERIFY_PROVIDER
  const apiKey = process.env.IDENTITY_VERIFY_API_KEY
  if (!provider || !apiKey) {
    // 제공사 결정 전까지 바인딩은 의도적으로 차단
    throw new IdentityError('PROVIDER_NOT_CONFIGURED', '본인인증 제공사가 설정되지 않았습니다.')
  }
  // TODO(provider 확정 시): provider API 로 token 검증 → 인증된 휴대폰 반환.
  // 예) const res = await fetch(providerVerifyUrl, { ... }); return { phone: res.phone, provider }
  void token
  throw new IdentityError('VERIFY_FAILED', `미구현 제공사: ${provider}`)
}

class IdentityError extends Error {
  constructor(
    public code: 'PROVIDER_NOT_CONFIGURED' | 'VERIFY_FAILED',
    message: string,
  ) {
    super(message)
  }
}

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
