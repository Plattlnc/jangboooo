'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { setAdminSession, clearAdminSession } from '@/lib/auth/admin-cookies'
import { constantTimeEqual } from '@/lib/auth/session'

/**
 * 관리자 로그인 — 단일 계정(협력사 관리자).
 * 크리덴셜은 env(ADMIN_LOGIN_ID/ADMIN_LOGIN_PASSWORD)로 오버라이드 가능, 미설정 시 합의된 기본값.
 * 실패 사유는 미구분(계정 열거 방지) — 상수시간 비교.
 */

const DEFAULT_ADMIN_ID = 'admiplatt'
const DEFAULT_ADMIN_PASSWORD = '1227'

const signInAdminSchema = z.object({
  id: z.string().min(1).max(64),
  password: z.string().min(1).max(64),
})

export type AdminSignInResult = { ok: true } | { ok: false; message: string }

export async function signInAdmin(input: unknown): Promise<AdminSignInResult> {
  const parsed = signInAdminSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: '아이디와 비밀번호를 입력해 주세요.' }
  }
  const expectedId = process.env.ADMIN_LOGIN_ID ?? DEFAULT_ADMIN_ID
  const expectedPw = process.env.ADMIN_LOGIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD

  const idOk = constantTimeEqual(parsed.data.id, expectedId)
  const pwOk = constantTimeEqual(parsed.data.password, expectedPw)
  if (!idOk || !pwOk) {
    return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  await setAdminSession()
  return { ok: true }
}

/** 관리자 로그아웃 → /admin/login. */
export async function signOutAdmin(): Promise<void> {
  await clearAdminSession()
  redirect('/admin/login')
}
