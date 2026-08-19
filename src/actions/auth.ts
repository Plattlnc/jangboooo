'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { setRiderSession, clearRiderSession, setSavedLoginCookie } from '@/lib/auth/cookies'
import { constantTimeEqual } from '@/lib/auth/session'
import { isRiderTerminated, CONTRACT_TERMINATED_MESSAGE } from '@/lib/contract'
import { signInRiderSchema, type SignInResult } from '@/types/api'

/**
 * 라이더 로그인: ID(admin_rider_id) + 비밀번호(등록 휴대폰 뒤 4자리).
 * service_role 로 riders 조회(RLS 우회) → 존재 + 활성 + 뒤4자리 일치(상수시간) 검증 → 서명 세션 쿠키.
 * 에러코드(스펙 #19): 미식별 RIDER_NOT_FOUND / 비번불일치 INVALID_PASSWORD.
 * (참고: 구분 코드는 rider_id 열거를 허용 — 4자리 비번 특성상 본질적 완화책은 레이트리밋.)
 */
export async function signInRider(input: unknown): Promise<SignInResult> {
  const parsed = signInRiderSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_INPUT', message: '아이디와 4자리 비밀번호를 확인해주세요.' }
  }
  const { riderId, password } = parsed.data

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return { ok: false, code: 'SERVER_ERROR', message: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  // 아이디 대소문자 무시 매칭(사용자 확정, 2026-08-19).
  // 배경: 배민 grider가 발급하는 admin_rider_id 는 대소문자가 섞임(예: 'Ksh5501').
  //       라이더가 소문자로 입력해도 로그인이 되어야 하고, 대소문자 중복 행이 존재하는
  //       경우엔 스크래퍼가 실제 데이터를 쌓고 있는 쪽(=updated_at 최신)을 골라야 한다.
  //       그래야 로그인 후 대시보드가 그 라이더의 실제 스냅샷을 조회한다.
  // ilike 는 postgrest에서 '*'가 와일드카드지만 grider의 실 아이디는 영숫자뿐이라
  // 실사용상 무해. 그래도 방어적으로 아래에서 toLowerCase() 재검증한다.
  const { data: candidates, error } = await admin
    .from('riders')
    .select('admin_rider_id, phone_norm, is_active, name')
    .ilike('admin_rider_id', riderId)
    .order('updated_at', { ascending: false })
    .limit(2)
  if (error) {
    return { ok: false, code: 'SERVER_ERROR', message: '일시적인 오류입니다. 잠시 후 다시 시도해주세요.' }
  }

  // ilike 오탐 방지: JS 레이어에서 소문자 완전일치만 통과.
  const wanted = riderId.toLowerCase()
  const rider = (candidates ?? []).find((r) => r.admin_rider_id.toLowerCase() === wanted) ?? null

  // 식별 불가(미존재/비활성/휴대폰 없음).
  if (!rider || !rider.is_active || !rider.phone_norm) {
    return { ok: false, code: 'RIDER_NOT_FOUND', message: '등록된 라이더를 찾을 수 없습니다.' }
  }
  // 비번 = 휴대폰 뒤 4자리(상수시간 비교).
  if (!constantTimeEqual(password, rider.phone_norm.slice(-4))) {
    return { ok: false, code: 'INVALID_PASSWORD', message: '비밀번호가 올바르지 않습니다.' }
  }

  // 계약종료(탈퇴) 라이더 로그인 차단 — 비번 검증 후 확인(계정 열거로 계약상태 노출 방지).
  if (await isRiderTerminated(rider.admin_rider_id)) {
    return { ok: false, code: 'CONTRACT_TERMINATED', message: CONTRACT_TERMINATED_MESSAGE }
  }

  await setRiderSession(rider.admin_rider_id)
  // 아이디·비번 저장: localStorage 만으론 iOS 7일 삭제·브라우저 정리에 취약 →
  // 서버 장수명 쿠키로도 보존(미들웨어가 접속 시마다 수명 연장). 미전달(구 클라이언트)이면 현상 유지.
  const remember = parsed.data.remember
  if (remember) {
    await setSavedLoginCookie(
      remember.save ? { id: rider.admin_rider_id, pw: password, auto: remember.auto } : null,
    )
  }
  return { ok: true, adminRiderId: rider.admin_rider_id, name: rider.name }
}

/**
 * 로그아웃: 서명 세션 쿠키를 안전하게 제거하고 /login 으로 리다이렉트.
 * redirect() 는 NEXT_REDIRECT 를 throw 하므로 정상 반환하지 않는다(서버측 네비게이션).
 * 클라이언트가 별도 네비게이션을 해도 동일 경로(/login)라 무해.
 * ?out=1: 명시적 로그아웃 표시 — 로그인 폼이 이번 진입만 자동 로그인을 건너뛴다
 * (없으면 로그아웃 → 자동 재로그인 루프로 로그아웃이 불가능해진다).
 */
export async function signOutRider(): Promise<void> {
  await clearRiderSession()
  redirect('/login?out=1')
}
