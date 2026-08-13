'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { setSettlementSession, clearSettlementSession } from '@/lib/auth/settlement-cookies'
import { constantTimeEqual } from '@/lib/auth/session'

/**
 * 정산팀 로그인 — 정산 담당 계정. 관리자/라이더와 완전 분리.
 * 크리덴셜은 env(SETTLEMENT_ACCOUNTS="id:pw,id2:pw2")로 오버라이드 권장,
 * 미설정 시 아래 기본 계정. 실패 사유 미구분(계정 열거 방지) — 상수시간 비교.
 */

type SettlementAccount = { id: string; password: string }

// 기본 정산 계정(코드). 추가/변경은 여기 또는 env SETTLEMENT_ACCOUNTS 로.
const DEFAULT_ACCOUNTS: SettlementAccount[] = [
  { id: 'gs01310', password: '***REMOVED***' },
]

/** env SETTLEMENT_ACCOUNTS("id:pw,id2:pw2") → 계정 목록. 하위호환: SETTLEMENT_LOGIN_ID/PASSWORD. */
function loadAccounts(): SettlementAccount[] {
  const raw = process.env.SETTLEMENT_ACCOUNTS
  if (raw) {
    const parsed = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((pair) => {
        const i = pair.indexOf(':')
        return i > 0 ? { id: pair.slice(0, i), password: pair.slice(i + 1) } : null
      })
      .filter((a): a is SettlementAccount => a != null)
    if (parsed.length) return parsed
  }
  const id = process.env.SETTLEMENT_LOGIN_ID
  const pw = process.env.SETTLEMENT_LOGIN_PASSWORD
  if (id && pw) return [{ id, password: pw }]
  return DEFAULT_ACCOUNTS
}

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
  // 모든 계정을 검사(조기 반환 없이) — 계정 존재/타이밍 노출 방지.
  let match = false
  for (const acc of loadAccounts()) {
    const idOk = constantTimeEqual(parsed.data.id, acc.id)
    const pwOk = constantTimeEqual(parsed.data.password, acc.password)
    if (idOk && pwOk) match = true
  }
  if (!match) {
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
