import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_MODE } from '@/lib/demo'
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE,
  verifyAdminSessionToken,
  verifySessionToken,
} from '@/lib/auth/session'

// 보호 경로 가드 — 라이더(/dashboard, 서명 세션)와 관리자(/admin, 별도 서명 세션) 분리.
// 인증 계약 SSOT: docs/api/sla-api.md §3·6.
export async function middleware(request: NextRequest) {
  // 데모 모드(#13) 또는 SESSION_SECRET 미설정(프로비저닝 전) → 가드 비활성(목 화면 검증 유지).
  if (DEMO_MODE || !process.env.SESSION_SECRET) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  // 관리자 영역: /admin/* 전부 보호(로그인 페이지 제외). 라이더 세션과 상호 인정 없음.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return NextResponse.next()
    const ok = await verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)
    if (!ok) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

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
