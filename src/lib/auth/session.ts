/**
 * 라이더 세션 토큰 — HMAC-SHA256 서명(Web Crypto). 의존성 없음.
 * Edge(미들웨어) · Node(서버액션/RSC) 양쪽에서 동작하도록 next/headers 등 런타임 의존 import 금지.
 * 쿠키 read/write 는 server-only `./cookies.ts` 에서.
 *
 * 토큰 형식: base64url(payloadJSON) + "." + base64url(HMAC).
 * payload: { rid: admin_rider_id, iat, exp }.
 */

export const SESSION_COOKIE = 'rider_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14 // 14일

export interface RiderSession {
  adminRiderId: string
}

interface TokenPayload {
  rid: string
  iat: number
  exp: number
}

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET not set (>=16 chars required)')
  }
  return s
}

// ── base64url (Edge/Node 공통) ───────────────────────────────
function bytesToB64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlToBytes(s: string): Uint8Array {
  // 패딩 복원: base64url(무패딩) → 길이를 4의 배수로 맞춘다.
  // (구버전 `'=='.slice((s.length+3)%4)` 는 len%4===2 일 때 패딩을 1개만 붙여
  //  atob 가 'Invalid character' throw → verifySessionToken 이 null 반환 →
  //  미들웨어가 /dashboard 를 조용히 /login 으로 되돌리는 회귀를 유발했다.)
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}
const enc = new TextEncoder()

async function hmac(data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return new Uint8Array(sig)
}

/** 길이 노출 외 타이밍 누수 없는 문자열 비교. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** admin_rider_id → 서명 토큰. */
export async function createSessionToken(adminRiderId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: TokenPayload = { rid: adminRiderId, iat: now, exp: now + SESSION_TTL_SECONDS }
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)))
  const sig = bytesToB64url(await hmac(body))
  return `${body}.${sig}`
}

/** 토큰 검증 → 세션 또는 null(서명불일치/만료/형식오류). */
export async function verifySessionToken(token: string | undefined | null): Promise<RiderSession | null> {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = bytesToB64url(await hmac(body))
  if (!constantTimeEqual(sig, expected)) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as TokenPayload
    if (!payload.rid || typeof payload.exp !== 'number') return null
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null
    return { adminRiderId: payload.rid }
  } catch {
    return null
  }
}
