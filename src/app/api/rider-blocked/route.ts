import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, riderSessionCookieOptions } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// 계약종료(탈퇴) 라이더 세션 차단 — 라이더 레이아웃이 탈퇴 감지 시 이 경로로 보낸다.
// 라우트 핸들러는 쿠키 설정이 가능(서버 컴포넌트 렌더 중엔 불가). 응답 객체에 직접
// 세션 쿠키를 만료시켜(=미들웨어 재진입 시 세션 없음 보장) 로그인 안내로 리다이렉트.
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/login?blocked=contract", request.url));
  res.cookies.set(SESSION_COOKIE, "", { ...riderSessionCookieOptions(), maxAge: 0 });
  return res;
}
