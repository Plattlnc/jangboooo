'use server'

import { z } from 'zod'
import { scryptSync, timingSafeEqual } from 'node:crypto'
import { constantTimeEqual } from '@/lib/auth/session'
import {
  isSettlementSession,
  setRidersUnlock,
  clearRidersUnlock,
} from '@/lib/auth/settlement-cookies'

/**
 * 라이더 설정(주민번호) 2차 잠금 — 정산 세션 위 추가 비밀번호 게이트.
 * 비밀번호는 소스에 평문 저장하지 않고 scrypt(salt+hash)로만 보관. env RIDERS_SETTINGS_PASSWORD(평문) 오버라이드 가능.
 */

const SALT = '8c98533c138b990002dccd74d16aff49'
const HASH = '77b6ee3eeb1c8a300a9f3739f9bc332af9f19de0739e01f524f1f37dc223b2ed'

function verifyPassword(input: string): boolean {
  const envPw = process.env.RIDERS_SETTINGS_PASSWORD
  if (envPw) return constantTimeEqual(input, envPw)
  try {
    const expected = Buffer.from(HASH, 'hex')
    const actual = scryptSync(input, Buffer.from(SALT, 'hex'), expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

const schema = z.object({ password: z.string().min(1).max(64) })

export type UnlockResult = { ok: true } | { ok: false; message: string }

/** 2차 비밀번호 검증 → 잠금 해제 쿠키 설정. 정산 세션 필수. */
export async function unlockRiderSettings(input: unknown): Promise<UnlockResult> {
  if (!(await isSettlementSession())) {
    return { ok: false, message: '세션이 만료되었습니다. 다시 로그인해 주세요.' }
  }
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, message: '비밀번호를 입력해 주세요.' }
  if (!verifyPassword(parsed.data.password)) {
    return { ok: false, message: '2차 비밀번호가 올바르지 않습니다.' }
  }
  await setRidersUnlock()
  return { ok: true }
}

/** 라이더 설정 재잠금. */
export async function lockRiderSettings(): Promise<void> {
  await clearRidersUnlock()
}
