import 'server-only'

/**
 * 본인인증 어댑터 — **카카오 본인확인**(휴대폰 실명확인).
 *
 * 플로우: 클라이언트가 카카오 본인확인 동의 후 받은 **authorization code** 를
 * `verificationToken` 으로 서버에 전달 → 서버가 code→token 교환 → 검증된 휴대폰 조회.
 * (토큰 교환을 서버에서 하므로 client_secret 노출 없음.)
 *
 * 키 미발급 동안에는 `PROVIDER_NOT_CONFIGURED` 로 안전차단. 키 들어오면 env 만 채우면 동작.
 * 개발/테스트는 IDENTITY_VERIFY_SANDBOX=true + `mock:<휴대폰>` 토큰으로 우회(운영 비활성).
 */

export interface VerifiedIdentity {
  /** 국내 정규화 휴대폰 (예: 01012345678) */
  phone: string
  provider: string
  name?: string | null
  /** 카카오 account_ci (연계정보) — 있으면 보관 */
  ci?: string | null
}

export type IdentityErrorCode = 'PROVIDER_NOT_CONFIGURED' | 'VERIFY_FAILED'

export class IdentityError extends Error {
  constructor(
    public code: IdentityErrorCode,
    message: string,
  ) {
    super(message)
  }
}

// 카카오 응답(필요 필드만)
interface KakaoTokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}
interface KakaoAccount {
  phone_number?: string
  name?: string
  ci?: string
}
interface KakaoMeResponse {
  kakao_account?: KakaoAccount
}

function kakaoConfigured(): boolean {
  return (
    process.env.IDENTITY_VERIFY_PROVIDER === 'kakao' &&
    !!process.env.KAKAO_IDENTITY_CLIENT_ID &&
    !!process.env.KAKAO_IDENTITY_CLIENT_SECRET &&
    !!process.env.KAKAO_IDENTITY_REDIRECT_URI
  )
}

/** 카카오 휴대폰 표기(+82 10-1234-5678) → 국내 숫자(01012345678) */
function normalizeKrPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('82')) return '0' + digits.slice(2)
  return digits
}

async function verifyWithKakao(code: string): Promise<VerifiedIdentity> {
  const clientId = process.env.KAKAO_IDENTITY_CLIENT_ID!
  const clientSecret = process.env.KAKAO_IDENTITY_CLIENT_SECRET!
  const redirectUri = process.env.KAKAO_IDENTITY_REDIRECT_URI!

  // 1) authorization code → access token
  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }),
  })
  const token = (await tokenRes.json()) as KakaoTokenResponse
  if (!tokenRes.ok || !token.access_token) {
    throw new IdentityError('VERIFY_FAILED', `kakao token 교환 실패: ${token.error_description ?? tokenRes.status}`)
  }

  // 2) access token → 검증된 사용자 정보(휴대폰)
  const meRes = await fetch('https://kapi.kakao.com/v2/user/me?secure_resource=true', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  if (!meRes.ok) {
    throw new IdentityError('VERIFY_FAILED', `kakao user/me 실패: ${meRes.status}`)
  }
  const me = (await meRes.json()) as KakaoMeResponse
  const account = me.kakao_account
  if (!account?.phone_number) {
    // 본인확인 동의항목(phone_number) 미허용 등
    throw new IdentityError('VERIFY_FAILED', '카카오에서 검증된 휴대폰을 받지 못했습니다(동의항목 확인).')
  }

  return {
    phone: normalizeKrPhone(account.phone_number),
    provider: 'kakao',
    name: account.name ?? null,
    ci: account.ci ?? null,
  }
}

/** 샌드박스(개발/테스트 전용): `mock:01012345678` 형태 토큰만 허용. 운영에서 비활성. */
function verifySandbox(token: string): VerifiedIdentity {
  const m = /^mock:(\d{10,11})$/.exec(token)
  if (!m) throw new IdentityError('VERIFY_FAILED', '유효하지 않은 mock 토큰(mock:01012345678 형식)')
  return { phone: m[1], provider: 'kakao-sandbox' }
}

/**
 * verificationToken(카카오 authorization code)을 검증해 인증된 휴대폰을 반환.
 * - 샌드박스 ON(비운영): mock 토큰 허용
 * - 카카오 키 미설정: PROVIDER_NOT_CONFIGURED
 * - 그 외: 카카오 본인확인 수행
 */
export async function verifyIdentity(token: string): Promise<VerifiedIdentity> {
  if (process.env.IDENTITY_VERIFY_SANDBOX === 'true' && process.env.NODE_ENV !== 'production') {
    return verifySandbox(token)
  }
  if (!kakaoConfigured()) {
    throw new IdentityError('PROVIDER_NOT_CONFIGURED', '카카오 본인확인 키가 설정되지 않았습니다.')
  }
  return verifyWithKakao(token)
}
