import { describe, it, expect, afterEach, vi } from "vitest";
import { verifyIdentity, IdentityError } from "@/lib/identity/verify";

// 본인인증 어댑터(카카오). 샌드박스/미설정/실패/정규화 분기. fetch 는 모킹.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mockFetchSequence(responses: Array<{ ok: boolean; body: unknown }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({ ok: r.ok, status: r.ok ? 200 : 400, json: async () => r.body });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("샌드박스 모드 (개발/테스트 전용)", () => {
  it("해피: mock:01012345678 → 정규화 휴대폰 + sandbox provider", async () => {
    vi.stubEnv("IDENTITY_VERIFY_SANDBOX", "true");
    vi.stubEnv("NODE_ENV", "test");
    await expect(verifyIdentity("mock:01012345678")).resolves.toEqual({
      phone: "01012345678",
      provider: "kakao-sandbox",
    });
  });

  it("에러: 형식이 틀린 mock 토큰 → VERIFY_FAILED", async () => {
    vi.stubEnv("IDENTITY_VERIFY_SANDBOX", "true");
    vi.stubEnv("NODE_ENV", "test");
    await expect(verifyIdentity("not-a-mock")).rejects.toMatchObject({
      code: "VERIFY_FAILED",
    });
  });

  it("보안: production 에서는 샌드박스가 비활성(키 미설정 → 차단)", async () => {
    vi.stubEnv("IDENTITY_VERIFY_SANDBOX", "true");
    vi.stubEnv("NODE_ENV", "production");
    // 샌드박스 우회 불가 → kakaoConfigured 미충족 → PROVIDER_NOT_CONFIGURED
    await expect(verifyIdentity("mock:01012345678")).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });
});

describe("미설정 안전차단", () => {
  it("샌드박스 off + 카카오 키 없음 → PROVIDER_NOT_CONFIGURED (로그인은 별개로 동작)", async () => {
    vi.stubEnv("IDENTITY_VERIFY_SANDBOX", "false");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("IDENTITY_VERIFY_PROVIDER", "");
    vi.stubEnv("KAKAO_IDENTITY_CLIENT_ID", "");
    vi.stubEnv("KAKAO_IDENTITY_CLIENT_SECRET", "");
    vi.stubEnv("KAKAO_IDENTITY_REDIRECT_URI", "");
    await expect(verifyIdentity("anything")).rejects.toBeInstanceOf(IdentityError);
    await expect(verifyIdentity("anything")).rejects.toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
    });
  });
});

describe("카카오 본인확인 (키 설정됨)", () => {
  function configureKakao() {
    vi.stubEnv("IDENTITY_VERIFY_SANDBOX", "false");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("IDENTITY_VERIFY_PROVIDER", "kakao");
    vi.stubEnv("KAKAO_IDENTITY_CLIENT_ID", "cid");
    vi.stubEnv("KAKAO_IDENTITY_CLIENT_SECRET", "secret");
    vi.stubEnv("KAKAO_IDENTITY_REDIRECT_URI", "https://app/cb");
  }

  it("해피 + 정규화: +82 표기 휴대폰 → 0 으로 시작하는 국내번호", async () => {
    configureKakao();
    mockFetchSequence([
      { ok: true, body: { access_token: "at" } },
      { ok: true, body: { kakao_account: { phone_number: "+82 10-1234-5678", name: "홍길동", ci: "CI123" } } },
    ]);
    await expect(verifyIdentity("authcode")).resolves.toEqual({
      phone: "01012345678",
      provider: "kakao",
      name: "홍길동",
      ci: "CI123",
    });
  });

  it("토큰 교환 실패(access_token 없음) → VERIFY_FAILED", async () => {
    configureKakao();
    mockFetchSequence([{ ok: true, body: { error: "invalid_grant", error_description: "bad code" } }]);
    await expect(verifyIdentity("badcode")).rejects.toMatchObject({ code: "VERIFY_FAILED" });
  });

  it("user/me 가 휴대폰 동의항목 미포함 → VERIFY_FAILED", async () => {
    configureKakao();
    mockFetchSequence([
      { ok: true, body: { access_token: "at" } },
      { ok: true, body: { kakao_account: { name: "홍길동" } } }, // phone_number 없음
    ]);
    await expect(verifyIdentity("authcode")).rejects.toMatchObject({ code: "VERIFY_FAILED" });
  });
});
