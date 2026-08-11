'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { setSettlementSession, clearSettlementSession } from '@/lib/auth/settlement-cookies'
import { constantTimeEqual } from '@/lib/auth/session'

/**
 * 정산팀 로그인 — 단일 계정(정산 담당). 관리자/라이더와 완전 분리.
 * 크리덴셜은 env(SETTLEMENT_LOGIN_ID/SETTLEMENT_LOGIN_PASSWORD)로 오버라이드 권장,
 * 미설정 시 아래 기본값. 실패 사유 미구분(계정 열거 방지) — 상수시간 비교.
 */

const DEFAULT_SETTLEMENT_ID = 'settle'
const DEFAULT_SETTLEMENT_PASSWORD = '***REMOVED***'

const signInSettlementSchema = z.object({
  id: z.string().min(1).max(64),
  password: z.string().min(1).max(64),
})

export type SettlementSignInResult = { ok: true } | { ok: false; message: string }

export async function signInSettlement(input: unknown): Promise<SettlementSignInResult> {
  const parsed = signInSettlementSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: '아이디와 비밀번호를 입력해 주세요.' }
  }
  const expectedId = process.env.SETTLEMENT_LOGIN_ID ?? DEFAULT_SETTLEMENT_ID
  const expectedPw = process.env.SETTLEMENT_LOGIN_PASSWORD ?? DEFAULT_SETTLEMENT_PASSWORD

  const idOk = constantTimeEqual(parsed.data.id, expectedId)
  const pwOk = constantTimeEqual(parsed.data.password, expectedPw)
  if (!idOk || !pwOk) {
    return { ok: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' }
  }

  await setSettlementSession()
  return { ok: true }
}

/** 정산팀 로그아웃 → /settlement/login. */
export async function signOutSettlement(): Promise<void> {
  await clearSettlementSession()
  redirect('/settlement/login')
}
