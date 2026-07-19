import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// /dashboard 보호 게이트 (src/middleware.ts). 커스텀 서명 세션 기준.
// DEMO_MODE 는 모듈 상수라 모킹(기본 false=가드 활성). SESSION_SECRET 로 가드 on/off.

vi.mock("@/lib/demo", () => ({ DEMO_MODE: false }));

import { middleware } from "@/middleware";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionToken,
  createSessionToken,
  SESSION_COOKIE,
} from "@/lib/auth/session";

const SECRET = "test-secret-0123456789-abcdef"; // ≥16자

beforeEach(() => vi.stubEnv("SESSION_SECRET", SECRET));
afterEach(() => vi.unstubAllEnvs());

function req(path: string, cookie?: string, cookieName: string = SESSION_COOKIE) {
  const r = new NextRequest(new URL(`http://localhost${path}`));
  if (cookie) r.cookies.set(cookieName, cookie);
  return r;
}

function redirectLocation(res: Response): URL | null {
  const loc = res.headers.get("location");
  return loc ? new URL(loc) : null;
}

describe("middleware — 보호 경로 가드(가드 활성)", () => {
  it("미인증 + /dashboard → /login?next=/dashboard 로 리다이렉트", async () => {
    const res = await middleware(req("/dashboard"));
    expect(res.status).toBe(307);
    const loc = redirectLocation(res);
    expect(loc?.pathname).toBe("/login");
    expect(loc?.searchParams.get("next")).toBe("/dashboard");
  });

  it("유효 세션 쿠키 + /dashboard → 통과(리다이렉트 없음)", async () => {
    const token = await createSessionToken("R-1");
    const res = await middleware(req("/dashboard", token));
    expect(redirectLocation(res)).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("위조/무효 쿠키 + /dashboard → /login 리다이렉트", async () => {
    const res = await middleware(req("/dashboard", "garbage.token"));
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/login");
  });

  it("다른 시크릿으로 서명된 토큰 → 거부(리다이렉트)", async () => {
    const token = await createSessionToken("R-1"); // 현재 시크릿으로 서명
    vi.stubEnv("SESSION_SECRET", "totally-different-secret-key-123");
    const res = await middleware(req("/dashboard", token));
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/login");
  });

  it("보호 대상 아닌 경로(/login) → 미인증이어도 통과", async () => {
    const res = await middleware(req("/login"));
    expect(redirectLocation(res)).toBeNull();
  });

  it("하위 경로(/dashboard/settings)도 보호 대상", async () => {
    const res = await middleware(req("/dashboard/settings"));
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/login");
  });
});

describe("middleware — 가드 비활성 우회", () => {
  it("SESSION_SECRET 미설정(프로비저닝 전) → /dashboard 통과", async () => {
    vi.stubEnv("SESSION_SECRET", "");
    const res = await middleware(req("/dashboard"));
    expect(redirectLocation(res)).toBeNull();
  });
});

describe("middleware — 관리자 영역(/admin) 가드", () => {
  it("미인증 + /admin → /admin/login?next=/admin 리다이렉트", async () => {
    const res = await middleware(req("/admin"));
    expect(res.status).toBe(307);
    const loc = redirectLocation(res);
    expect(loc?.pathname).toBe("/admin/login");
    expect(loc?.searchParams.get("next")).toBe("/admin");
  });

  it("미인증 + 하위 경로(/admin/riders/R-1)도 보호", async () => {
    const res = await middleware(req("/admin/riders/R-1"));
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/admin/login");
  });

  it("/admin/login 은 미인증 통과", async () => {
    const res = await middleware(req("/admin/login"));
    expect(redirectLocation(res)).toBeNull();
  });

  it("유효 관리자 토큰 → 통과", async () => {
    const token = await createAdminSessionToken();
    const res = await middleware(req("/admin", token, ADMIN_SESSION_COOKIE));
    expect(redirectLocation(res)).toBeNull();
  });

  it("라이더 세션 쿠키로는 /admin 접근 불가(상호 인정 없음)", async () => {
    const riderToken = await createSessionToken("R-1");
    // 라이더 쿠키명/관리자 쿠키명 모두에 라이더 토큰을 실어도 거부돼야 한다.
    const r = new NextRequest(new URL("http://localhost/admin"));
    r.cookies.set(SESSION_COOKIE, riderToken);
    r.cookies.set(ADMIN_SESSION_COOKIE, riderToken);
    const res = await middleware(r);
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/admin/login");
  });

  it("관리자 토큰으로는 /dashboard 접근 불가(역방향 상호 인정 없음)", async () => {
    const adminToken = await createAdminSessionToken();
    const res = await middleware(req("/dashboard", adminToken));
    expect(res.status).toBe(307);
    expect(redirectLocation(res)?.pathname).toBe("/login");
  });
});
