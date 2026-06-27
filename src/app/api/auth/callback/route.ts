import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 카카오 OAuth 콜백.
 * signInWithOAuth → 카카오 인증 후 ?code 로 복귀 → 세션 쿠키로 교환 → next 로 이동.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 실패 시 로그인 화면으로(에러 표시는 프론트가 처리)
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
