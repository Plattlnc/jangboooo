/**
 * 라이더 세션 토큰 — HMAC-SHA256 서명(Web Crypto). 의존성 없음.
 * Edge(미들웨어) · Node(서버액션/RSC) 양쪽에서 동작하도록 next/headers 등 런타임 의존 import 금지.
 * 쿠키 read/write 는 server-only `./cookies.ts` 에서.
 *
 * 토큰 형식: base64url(payloadJSON) + "." + base64url(HMAC).
 * payload: { rid: admin_rider_id, iat, exp }.
 */

export const SESSION_COOKIE = 'rider_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365 // 365일 — 실사용자 상시 로그인 유지(브라우저 쿠키 상한 400일 이내)
// 발급 후 이 시간이 지난 토큰은 미들웨어가 재발급(슬라이딩 만료) — 가끔이라도 접속하면 만료가 계속 뒤로 밀린다.
export const SESSION_RENEW_AFTER_SECONDS = 60 * 60 * 24 // 1일

// 관리자 세션 — 라이더와 쿠키/페이로드 분리(같은 서명 비밀 사용). 관리 화면 특성상 TTL 짧게.
export const ADMIN_SESSION_COOKIE = 'admin_session'
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12 // 12시간

// 정산팀 세션 — 관리자/라이더와 완전 분리(같은 서명 비밀, 별도 쿠키/플래그). 데스크톱 업무용, TTL 짧게.
export const SETTLEMENT_SESSION_COOKIE = 'settlement_session'
export const SETTLEMENT_SESSION_TTL_SECONDS = 60 * 60 * 12 // 12시간

// 라이더 설정(주민번호) 2차 잠금 — 정산 세션 위 추가 게이트. 민감정보 접근이라 TTL 짧게.
export const RIDERS_UNLOCK_COOKIE = 'settlement_riders_unlock'
export const RIDERS_UNLOCK_TTL_SECONDS = 60 * 60 * 2 // 2시간

export interface RiderSession {
  adminRiderId: string
  /** 토큰 발급 시각(epoch 초) — 미들웨어 슬라이딩 갱신 판단용. 페이로드에 없으면 0(즉시 갱신 대상). */
  issuedAt: number
}

/** 라이더 세션 쿠키 공통 속성 — 발급(cookies.ts)과 갱신(middleware) 간 불일치 방지. */
export function riderSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  }
}

// ── 아이디·비번 저장(자동 로그인) 쿠키 ─────────────────────────
// localStorage 는 iOS 사파리 7일 미사용 삭제(ITP)·브라우저 정리에 취약 →
// 서버 Set-Cookie(ITP 상한 면제)로 보존하고 미들웨어가 접속 시마다 수명 연장.
// httpOnly=false 인 이유: 로그인 폼(클라이언트)이 읽어 프리필/자동 로그인해야 함.
// 평문 수준 노출은 사용자 명시 요구(본인 기기 전제, 비번=휴대폰 뒤4자리) 트레이드오프.
export const CREDS_COOKIE = 'rider_saved_login'
export const CREDS_TTL_SECONDS = 60 * 60 * 24 * 400 // 브라우저 쿠키 수명 상한(크롬 400일)

export interface SavedLogin {
  id: string
  pw: string
  auto: boolean
}

export function credsCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: CREDS_TTL_SECONDS,
  }
}

export function encodeSavedLogin(v: SavedLogin): string {
  return bytesToB64url(enc.encode(JSON.stringify(v)))
}

export function decodeSavedLogin(raw: string | undefined | null): SavedLogin | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(new TextDecoder().decode(b64urlToBytes(raw))) as Partial<SavedLogin>
    if (typeof parsed.id !== 'string' || typeof parsed.pw !== 'string') return null
    return { id: parsed.id, pw: parsed.pw, auto: parsed.auto === true }
  } catch {
    return null
  }
}

interface TokenPayload {
  rid: string
  iat: number
  exp: number
}

/** 관리자 토큰 페이로드 — rid 대신 adm 플래그(라이더 토큰과 상호 오인 불가). */
interface AdminTokenPayload {
  adm: true
  iat: number
  exp: number
}

/** 정산팀 토큰 페이로드 — stl 플래그(라이더/관리자 토큰과 상호 오인 불가). */
interface SettlementTokenPayload {
  stl: true
  iat: number
  exp: number
}

/** 라이더 설정 2차 잠금 해제 토큰 페이로드 — rsu 플래그. */
interface RidersUnlockPayload {
  rsu: true
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

/** 관리자 서명 토큰 생성. */
export async function createAdminSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: AdminTokenPayload = { adm: true, iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS }
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)))
  const sig = bytesToB64url(await hmac(body))
  return `${body}.${sig}`
}

/** 관리자 토큰 검증 — 유효하면 true(서명불일치/만료/형식오류/라이더 토큰이면 false). */
export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = bytesToB64url(await hmac(body))
  if (!constantTimeEqual(sig, expected)) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as Partial<AdminTokenPayload>
    if (payload.adm !== true || typeof payload.exp !== 'number') return false
    return Math.floor(Date.now() / 1000) < payload.exp
  } catch {
    return false
  }
}

/** 정산팀 서명 토큰 생성. */
export async function createSettlementSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SettlementTokenPayload = { stl: true, iat: now, exp: now + SETTLEMENT_SESSION_TTL_SECONDS }
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)))
  const sig = bytesToB64url(await hmac(body))
  return `${body}.${sig}`
}

/** 정산팀 토큰 검증 — 유효하면 true(서명불일치/만료/형식오류/라이더·관리자 토큰이면 false). */
export async function verifySettlementSessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = bytesToB64url(await hmac(body))
  if (!constantTimeEqual(sig, expected)) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as Partial<SettlementTokenPayload>
    if (payload.stl !== true || typeof payload.exp !== 'number') return false
    return Math.floor(Date.now() / 1000) < payload.exp
  } catch {
    return false
  }
}

/** 라이더 설정 2차 잠금 해제 토큰 생성. */
export async function createRidersUnlockToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: RidersUnlockPayload = { rsu: true, iat: now, exp: now + RIDERS_UNLOCK_TTL_SECONDS }
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)))
  const sig = bytesToB64url(await hmac(body))
  return `${body}.${sig}`
}

/** 라이더 설정 2차 잠금 해제 토큰 검증. */
export async function verifyRidersUnlockToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = bytesToB64url(await hmac(body))
  if (!constantTimeEqual(sig, expected)) return false
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body))) as Partial<RidersUnlockPayload>
    if (payload.rsu !== true || typeof payload.exp !== 'number') return false
    return Math.floor(Date.now() / 1000) < payload.exp
  } catch {
    return false
  }
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
    return { adminRiderId: payload.rid, issuedAt: typeof payload.iat === 'number' ? payload.iat : 0 }
  } catch {
    return null
  }
}
