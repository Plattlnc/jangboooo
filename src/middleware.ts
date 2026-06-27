import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_MODE } from '@/lib/demo'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

// 보호 경로(/dashboard) 가드. 커스텀 서명 세션(라이더 ID/비번 로그인) 기준.
// 인증 계약 SSOT: docs/api/sla-api.md §3·6.
export async function middleware(request: NextRequest) {
  // 데모 모드(#13) 또는 SESSION_SECRET 미설정(프로비저닝 전) → 가드 비활성(목 화면 검증 유지).
  if (DEMO_MODE || !process.env.SESSION_SECRET) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl
  const isProtected = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  if (!isProtected) return NextResponse.next()

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icons/|og-image\\.png|manifest\\.webmanifest|robots\\.txt|.*\\.(?:png|svg|ico|css|js|woff2?)$).*)',
  ],
}
