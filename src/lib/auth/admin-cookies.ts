import 'server-only'
import { cookies } from 'next/headers'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from '@/lib/auth/session'

/**
 * 관리자 세션 쿠키 헬퍼(서버 전용) — 라이더용 cookies.ts 와 동일 규약.
 * 미들웨어(Edge)는 session.ts 의 verifyAdminSessionToken + request.cookies 사용.
 */

/** 현재 요청이 유효한 관리자 세션인지. */
export async function isAdminSession(): Promise<boolean> {
  const store = await cookies()
  return verifyAdminSessionToken(store.get(ADMIN_SESSION_COOKIE)?.value)
}

/** 관리자 로그인 성공 시 서명 세션 쿠키 설정. */
export async function setAdminSession(): Promise<void> {
  const token = await createAdminSessionToken()
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  })
}

/** 관리자 로그아웃 — 발급 시 속성과 동일하게 만료 후 삭제(라이더 clearRiderSession 과 동일 이중 안전). */
export async function clearAdminSession(): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  store.delete({ name: ADMIN_SESSION_COOKIE, path: '/' })
}
