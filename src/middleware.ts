import { NextResponse, type NextRequest } from "next/server";

// SSR 세션 갱신 + 보호 경로 가드. 인증 계약 SSOT: docs/api/sla-api.md §3·6.
// Supabase env 미설정(devops 프로비저닝 전)이면 가드 비활성 → 목 화면 검증을 유지한다.
export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  // env 있을 때만 supabase ssr 로드(세션 쿠키 갱신).
  const { updateSession } = await import("@/lib/supabase/middleware");
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isProtected = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // 정적/이미지/메타 파일 제외 전 경로에서 세션 갱신.
  matcher: [
    "/((?!_next/static|_next/image|icons/|og-image\\.png|manifest\\.webmanifest|robots\\.txt|.*\\.(?:png|svg|ico|css|js|woff2?)$).*)",
  ],
};
