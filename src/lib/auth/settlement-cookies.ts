import 'server-only'
import { cookies } from 'next/headers'
import {
  SETTLEMENT_SESSION_COOKIE,
  SETTLEMENT_SESSION_TTL_SECONDS,
  RIDERS_UNLOCK_COOKIE,
  RIDERS_UNLOCK_TTL_SECONDS,
  createSettlementSessionToken,
  verifySettlementSessionToken,
  createRidersUnlockToken,
  verifyRidersUnlockToken,
} from '@/lib/auth/session'

/**
 * 정산팀 세션 쿠키 헬퍼(서버 전용) — 관리자용 admin-cookies.ts 와 동일 규약, 쿠키만 분리.
 * 미들웨어(Edge)는 session.ts 의 verifySettlementSessionToken + request.cookies 사용.
 */

/** 현재 요청이 유효한 정산팀 세션인지. */
export async function isSettlementSession(): Promise<boolean> {
  const store = await cookies()
  return verifySettlementSessionToken(store.get(SETTLEMENT_SESSION_COOKIE)?.value)
}

/** 정산팀 로그인 성공 시 서명 세션 쿠키 설정. */
export async function setSettlementSession(): Promise<void> {
  const token = await createSettlementSessionToken()
  const store = await cookies()
  store.set(SETTLEMENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SETTLEMENT_SESSION_TTL_SECONDS,
  })
}

/** 정산팀 로그아웃 — 발급 시 속성과 동일하게 만료 후 삭제(이중 안전). */
export async function clearSettlementSession(): Promise<void> {
  const store = await cookies()
  store.set(SETTLEMENT_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  store.delete({ name: SETTLEMENT_SESSION_COOKIE, path: '/' })
}

// ── 라이더 설정 2차 잠금 ──────────────────────────────────────

/** 현재 요청이 라이더 설정 2차 잠금을 해제한 상태인지. */
export async function isRidersUnlocked(): Promise<boolean> {
  const store = await cookies()
  return verifyRidersUnlockToken(store.get(RIDERS_UNLOCK_COOKIE)?.value)
}

/** 2차 비밀번호 검증 성공 시 잠금 해제 쿠키 설정(TTL 후 자동 재잠금). */
export async function setRidersUnlock(): Promise<void> {
  const token = await createRidersUnlockToken()
  const store = await cookies()
  store.set(RIDERS_UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: RIDERS_UNLOCK_TTL_SECONDS,
  })
}

/** 라이더 설정 재잠금(쿠키 삭제). */
export async function clearRidersUnlock(): Promise<void> {
  const store = await cookies()
  store.set(RIDERS_UNLOCK_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  store.delete({ name: RIDERS_UNLOCK_COOKIE, path: '/' })
}
