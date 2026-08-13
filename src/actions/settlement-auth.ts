'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { scryptSync, timingSafeEqual } from 'node:crypto'
import { setSettlementSession, clearSettlementSession } from '@/lib/auth/settlement-cookies'
import { constantTimeEqual } from '@/lib/auth/session'

/**
 * 정산팀 로그인 — 정산 담당 계정. 관리자/라이더와 완전 분리.
 * 비밀번호는 소스에 평문 저장하지 않고 scrypt(salt+hash)로만 보관 → 원문 노출 방지.
 * 계정 추가/변경은 아래 목록(해시) 또는 env SETTLEMENT_ACCOUNTS="id:pw,id2:pw2"(평문, 미커밋).
 * 실패 사유 미구분(계정 열거 방지) — 상수시간 비교.
 */

// 코드 기본 계정 — 비밀번호는 scrypt 해시(salt/hash 는 hex). 원문 비노출.
type HashedAccount = { id: string; salt: string; hash: string }
const HASHED_ACCOUNTS: HashedAccount[] = [
  {
    id: 'gs01310',
    salt: 'df1ec5f7211815eb3d67520761a3b1f7',
    hash: '7ae6c61ffb7dd4abc36e585fb67e1ac7fdf14047706baacb14e6166881c6f1a9',
  },
]

/** scrypt(비밀번호, salt) === 저장 해시 (상수시간 비교). */
function verifyHashed(password: string, salt: string, expectedHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex, 'hex')
    const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length)
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/** env SETTLEMENT_ACCOUNTS("id:pw,id2:pw2") → 평문 계정 목록(미설정 시 빈 배열). */
function envAccounts(): { id: string; password: string }[] {
  const raw = process.env.SETTLEMENT_ACCOUNTS
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':')
      return i > 0 ? { id: pair.slice(0, i), password: pair.slice(i + 1) } : null
    })
    .filter((a): a is { id: string; password: string } => a != null)
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
  const { id, password } = parsed.data

  // 조기 반환 없이 전 계정 검사 — 계정 존재/타이밍 노출 방지.
  let match = false
  // env 오버라이드(있으면) — 평문 상수시간 비교.
  for (const acc of envAccounts()) {
    if (constantTimeEqual(id, acc.id) && constantTimeEqual(password, acc.password)) match = true
  }
  // 코드 기본 계정 — scrypt 해시 검증.
  for (const acc of HASHED_ACCOUNTS) {
    const idOk = constantTimeEqual(id, acc.id)
    const pwOk = verifyHashed(password, acc.salt, acc.hash)
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
