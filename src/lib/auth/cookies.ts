import 'server-only'
import { cookies } from 'next/headers'
import {
  CREDS_COOKIE,
  SESSION_COOKIE,
  createSessionToken,
  credsCookieOptions,
  encodeSavedLogin,
  riderSessionCookieOptions,
  verifySessionToken,
  type RiderSession,
  type SavedLogin,
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
  store.set(SESSION_COOKIE, token, riderSessionCookieOptions())
}

/**
 * 로그아웃 — 세션 쿠키를 안전하게 제거.
 * delete(name) 만으로는 발급 시 속성(path '/')과 어긋날 여지가 있어,
 * 설정 때와 동일한 속성으로 만료(maxAge 0)시킨 뒤 이름으로도 삭제한다(이중 안전).
 */
export async function clearRiderSession(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', { ...riderSessionCookieOptions(), maxAge: 0 })
  store.delete({ name: SESSION_COOKIE, path: '/' })
}

/**
 * 아이디·비번 저장 쿠키 설정/삭제 — 로그인 성공 시 remember 옵션에 따라 호출.
 * 로그아웃 시엔 지우지 않는다(저장의 목적 = 로그아웃 후에도 프리필).
 */
export async function setSavedLoginCookie(creds: SavedLogin | null): Promise<void> {
  const store = await cookies()
  if (creds) {
    store.set(CREDS_COOKIE, encodeSavedLogin(creds), credsCookieOptions())
  } else {
    store.set(CREDS_COOKIE, '', { ...credsCookieOptions(), maxAge: 0 })
    store.delete({ name: CREDS_COOKIE, path: '/' })
  }
}
