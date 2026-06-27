import { createClient } from '@/lib/supabase/client'

/**
 * 카카오 간편로그인 시작(브라우저).
 * Supabase Auth Provider 에 Kakao 등록 필요(KAKAO_REST_API_KEY / CLIENT_SECRET).
 * 로그인 성공 → /api/auth/callback 에서 code 교환 → next 로 리다이렉트.
 */
export async function signInWithKakao(next: string = '/') {
  const supabase = createClient()
  const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo },
  })
  if (error) throw error
  return data
}

/** 로그아웃(브라우저) */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
