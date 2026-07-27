import { NextResponse, type NextRequest } from 'next/server'
import { DEMO_MODE } from '@/lib/demo'
import {
  ADMIN_SESSION_COOKIE,
  CREDS_COOKIE,
  SESSION_COOKIE,
  SESSION_RENEW_AFTER_SECONDS,
  createSessionToken,
  credsCookieOptions,
  riderSessionCookieOptions,
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

  // 루트/로그인 진입 시 유효 세션이 있으면 대시보드로 — 브라우저 재시작 후 홈 URL 로
  // 들어와도 쿠키가 살아있는 한 로그인 화면을 다시 보이지 않는다.
  if (pathname === '/' || pathname === '/login') {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
    if (session) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
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

  // 슬라이딩 갱신: 발급 후 하루 지난 토큰은 재발급 — 접속이 이어지는 한 만료(365일)가 계속 뒤로 밀려
  // 실사용자는 사실상 로그아웃되지 않는다. (매 요청 갱신은 Set-Cookie 낭비라 1일 간격으로 제한.)
  const response = NextResponse.next()
  if (Math.floor(Date.now() / 1000) - session.issuedAt >= SESSION_RENEW_AFTER_SECONDS) {
    response.cookies.set(
      SESSION_COOKIE,
      await createSessionToken(session.adminRiderId),
      riderSessionCookieOptions(),
    )
    // 아이디·비번 저장 쿠키도 같은 주기로 수명 연장(값 그대로, 만료만 리셋)
    // — 가끔이라도 접속하면 400일 상한이 계속 뒤로 밀려 사실상 소멸하지 않는다.
    const savedLogin = request.cookies.get(CREDS_COOKIE)?.value
    if (savedLogin) {
      response.cookies.set(CREDS_COOKIE, savedLogin, credsCookieOptions())
    }
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|icons/|og-image\\.png|manifest\\.webmanifest|robots\\.txt|.*\\.(?:png|svg|ico|css|js|woff2?)$).*)',
  ],
}
