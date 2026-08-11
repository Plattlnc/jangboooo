import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
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

/**
 * 방문 로그(0017, 사용 현황): 라이더 앱 오픈 1건 = app_visits 1행. best-effort —
 * 실패해도 요청 흐름에 영향 없음. RSC/프리페치 요청은 호출부에서 걸러 문서 요청만 온다.
 */
function logVisit(adminRiderId: string, path: string, event: NextFetchEvent): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  event.waitUntil(
    fetch(`${url}/rest/v1/app_visits`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ admin_rider_id: adminRiderId, path }),
    }).catch(() => {}),
  )
}

// 보호 경로 가드 — 라이더(/dashboard, 서명 세션)와 관리자(/admin, 별도 서명 세션) 분리.
// 인증 계약 SSOT: docs/api/sla-api.md §3·6.
export async function middleware(request: NextRequest, event: NextFetchEvent) {
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

  // 사용 현황: 실제 앱 오픈(전체 문서 로드)만 1건 기록. 브라우저가 최상위 내비게이션에만
  // 붙이는 Sec-Fetch-Dest=document 로 판정 → RSC 클라 내비·자동 새로고침(60s 폴링)·프리페치는
  // 모두 Sec-Fetch-Dest=empty 라 제외돼, 한 번 새로고침당 최대 1건만 카운트된다.
  // (헤더 미지원 구형 브라우저는 기존 rsc/prefetch 헤더 부재로 폴백.)
  const dest = request.headers.get('sec-fetch-dest')
  const isAppOpen =
    dest === 'document' ||
    (dest === null && !request.headers.get('rsc') && !request.headers.get('next-router-prefetch'))
  if (isAppOpen) {
    logVisit(session.adminRiderId, pathname, event)
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
