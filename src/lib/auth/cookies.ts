import 'server-only'
import { cookies } from 'next/headers'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  type RiderSession,
} from '@/lib/auth/session'

/**
 * 서버(Server Component / Server Action / Route Handler)용 세션 쿠키 헬퍼.
 * 미들웨어(Edge)는 이 파일을 쓰지 말고 `session.ts`의 verifySessionToken + request.cookies 사용.
 */

/** 현재 요청의 라이더 세션(없거나 무효면 null). */
export async function getRiderSession(): Promise<RiderSession | null> {
  const store = await cookies()
  return verifySessionToken(store.get(SESSION_COOKIE)?.value)
}

/** 로그인 성공 시 서명 세션 쿠키 설정. */
export async function setRiderSession(adminRiderId: string): Promise<void> {
  const token = await createSessionToken(adminRiderId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

/**
 * 로그아웃 — 세션 쿠키를 안전하게 제거.
 * delete(name) 만으로는 발급 시 속성(path '/')과 어긋날 여지가 있어,
 * 설정 때와 동일한 속성으로 만료(maxAge 0)시킨 뒤 이름으로도 삭제한다(이중 안전).
 */
export async function clearRiderSession(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  store.delete({ name: SESSION_COOKIE, path: '/' })
}
