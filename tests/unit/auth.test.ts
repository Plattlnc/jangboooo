import { describe, it, expect, vi, beforeEach } from "vitest";

// 라이더 로그인 액션 signInRider (src/actions/auth.ts).
// 검증: 입력검증 / service_role 조회 / 상수시간 비번비교 / 세션설정 / 에러코드 분기.
// admin 클라이언트 + 쿠키 세션은 모킹(constantTimeEqual 은 실제 순수함수 사용).

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/auth/cookies", () => ({
  setRiderSession: vi.fn().mockResolvedValue(undefined),
  clearRiderSession: vi.fn().mockResolvedValue(undefined),
}));
// next/navigation redirect 는 NEXT_REDIRECT 를 throw 하는 동작을 모사.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { signInRider, signOutRider } from "@/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setRiderSession, clearRiderSession } from "@/lib/auth/cookies";
import { redirect } from "next/navigation";

const mockedCreateAdmin = vi.mocked(createAdminClient);
const mockedSetSession = vi.mocked(setRiderSession);
const mockedClearSession = vi.mocked(clearRiderSession);
const mockedRedirect = vi.mocked(redirect);

/**
 * riders 조회 한 건을 돌려주는 가짜 admin 클라이언트.
 * signInRider 는 이제 `.select().ilike().order().limit()` 후 결과를 배열로 받으므로
 * (대소문자 무시 매칭, 2026-08-19), 단일 행 result 를 배열로 감싸 반환한다.
 */
function fakeAdmin(result: { data: unknown; error: unknown }) {
  const wrapped = {
    data: result.data == null ? null : [result.data],
    error: result.error,
  };
  const builder: Record<string, unknown> = {};
  builder.select = () => builder;
  builder.eq = () => builder;
  builder.ilike = () => builder;
  builder.order = () => builder;
  builder.limit = () => builder;
  builder.maybeSingle = () => Promise.resolve(result);
  // thenable: await 시 결과 반환(체인 종단이 .limit() 인 경우).
  builder.then = (onResolve: (v: unknown) => unknown) => Promise.resolve(wrapped).then(onResolve);
  return { from: () => builder } as unknown as ReturnType<typeof createAdminClient>;
}

const ACTIVE_RIDER = {
  admin_rider_id: "R-1",
  phone_norm: "01012345678", // 뒤 4자리 = 5678
  is_active: true,
  name: "홍길동",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInRider — 입력 검증 (INVALID_INPUT, DB 접근 전)", () => {
  it("riderId 공백 → INVALID_INPUT, admin 조회 안 함", async () => {
    const r = await signInRider({ riderId: "  ", password: "5678" });
    expect(r).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(mockedCreateAdmin).not.toHaveBeenCalled();
  });

  it("비번이 4자리 숫자 아님 → INVALID_INPUT", async () => {
    for (const password of ["123", "12345", "abcd", ""]) {
      const r = await signInRider({ riderId: "R-1", password });
      expect(r).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    }
  });

  it("입력 형태 자체가 틀림(누락) → INVALID_INPUT", async () => {
    expect(await signInRider({})).toMatchObject({ ok: false, code: "INVALID_INPUT" });
    expect(await signInRider(null)).toMatchObject({ ok: false, code: "INVALID_INPUT" });
  });
});

describe("signInRider — 서버 오류 (SERVER_ERROR)", () => {
  it("createAdminClient 예외(env 미설정) → SERVER_ERROR, 세션 없음", async () => {
    mockedCreateAdmin.mockImplementation(() => {
      throw new Error("SERVICE_ROLE not configured");
    });
    const r = await signInRider({ riderId: "R-1", password: "5678" });
    expect(r).toMatchObject({ ok: false, code: "SERVER_ERROR" });
    expect(mockedSetSession).not.toHaveBeenCalled();
  });

  it("riders 조회 error → SERVER_ERROR", async () => {
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: null, error: new Error("db down") }));
    const r = await signInRider({ riderId: "R-1", password: "5678" });
    expect(r).toMatchObject({ ok: false, code: "SERVER_ERROR" });
  });
});

describe("signInRider — 식별 불가 (RIDER_NOT_FOUND)", () => {
  it("미존재(null) → RIDER_NOT_FOUND", async () => {
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: null, error: null }));
    expect(await signInRider({ riderId: "R-x", password: "5678" })).toMatchObject({
      ok: false,
      code: "RIDER_NOT_FOUND",
    });
  });

  it("비활성 라이더 → RIDER_NOT_FOUND", async () => {
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: { ...ACTIVE_RIDER, is_active: false }, error: null }));
    expect(await signInRider({ riderId: "R-1", password: "5678" })).toMatchObject({
      ok: false,
      code: "RIDER_NOT_FOUND",
    });
  });

  it("휴대폰(phone_norm) 없음 → RIDER_NOT_FOUND", async () => {
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: { ...ACTIVE_RIDER, phone_norm: null }, error: null }));
    expect(await signInRider({ riderId: "R-1", password: "5678" })).toMatchObject({
      ok: false,
      code: "RIDER_NOT_FOUND",
    });
  });
});

describe("signInRider — 비밀번호 검증 + 성공", () => {
  beforeEach(() => {
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: ACTIVE_RIDER, error: null }));
  });

  it("뒤4자리 불일치 → INVALID_PASSWORD, 세션 미설정", async () => {
    const r = await signInRider({ riderId: "R-1", password: "0000" });
    expect(r).toMatchObject({ ok: false, code: "INVALID_PASSWORD" });
    expect(mockedSetSession).not.toHaveBeenCalled();
  });

  it("뒤4자리 일치 → ok + 세션 설정(admin_rider_id)", async () => {
    const r = await signInRider({ riderId: "R-1", password: "5678" });
    expect(r).toEqual({ ok: true, adminRiderId: "R-1", name: "홍길동" });
    expect(mockedSetSession).toHaveBeenCalledExactlyOnceWith("R-1");
  });
});

describe("signInRider — 대소문자 무시 매칭 (2026-08-19)", () => {
  it("소문자로 입력해도 대문자 저장된 라이더에 로그인, 세션은 DB 원본 표기로 발급", async () => {
    // DB 원본 표기 = 'Ksh5501' (배민 grider 발급형)
    const dbRow = { admin_rider_id: "Ksh5501", phone_norm: "01082613134", is_active: true, name: "김성환" };
    mockedCreateAdmin.mockReturnValue(fakeAdmin({ data: dbRow, error: null }));
    const r = await signInRider({ riderId: "ksh5501", password: "3134" });
    expect(r).toEqual({ ok: true, adminRiderId: "Ksh5501", name: "김성환" });
    // 세션은 반드시 DB 원본 casing 으로 발급되어야 downstream RPC 가 스냅샷과 일치.
    expect(mockedSetSession).toHaveBeenCalledExactlyOnceWith("Ksh5501");
  });
});

describe("signInRider — 보안 계약(스펙 #19)", () => {
  it("미존재 vs 비번불일치는 서로 다른 코드(구분형 — rider_id 열거 허용 트레이드오프)", async () => {
    mockedCreateAdmin.mockReturnValueOnce(fakeAdmin({ data: null, error: null }));
    const notFound = await signInRider({ riderId: "R-x", password: "5678" });
    mockedCreateAdmin.mockReturnValueOnce(fakeAdmin({ data: ACTIVE_RIDER, error: null }));
    const badPw = await signInRider({ riderId: "R-1", password: "0000" });
    expect(notFound).toMatchObject({ code: "RIDER_NOT_FOUND" });
    expect(badPw).toMatchObject({ code: "INVALID_PASSWORD" });
    // ⚠️ 구분 코드는 의도적(리드 #19). 본질적 완화 = 레이트리밋(backend 에스컬레이션 중).
    // 만약 단일코드(열거방지)로 뒤집히면 위 두 코드가 동일해야 하므로 이 테스트를 뒤집을 것.
    expect(notFound).not.toMatchObject({ code: "INVALID_PASSWORD" });
  });
});

describe("signOutRider", () => {
  it("세션 쿠키 제거 후 /login 으로 리다이렉트", async () => {
    // redirect 는 NEXT_REDIRECT throw → 정상 반환하지 않음.
    // /login?out=1 은 로그아웃 명시 표시 — 로그인 폼이 이번 진입만 자동 로그인을 건너뛴다(재로그인 루프 방지).
    await expect(signOutRider()).rejects.toThrow("NEXT_REDIRECT:/login?out=1");
    expect(mockedClearSession).toHaveBeenCalledOnce();
    expect(mockedRedirect).toHaveBeenCalledWith("/login?out=1");
  });
});
