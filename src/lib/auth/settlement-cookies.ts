import 'server-only'
import { cookies } from 'next/headers'
import {
  SETTLEMENT_SESSION_COOKIE,
  SETTLEMENT_SESSION_TTL_SECONDS,
  createSettlementSessionToken,
  verifySettlementSessionToken,
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
