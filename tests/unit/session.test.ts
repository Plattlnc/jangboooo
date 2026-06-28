import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  constantTimeEqual,
} from "@/lib/auth/session";

// 라이더 세션 서명(HMAC-SHA256). 위변조/만료/시크릿 불일치 시 거부 검증.

beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-secret-至少十六자이상-0123456789"));
afterEach(() => vi.unstubAllEnvs());

describe("createSessionToken / verifySessionToken", () => {
  it("라운드트립: 서명 → 검증 시 admin_rider_id 복원", async () => {
    const token = await createSessionToken("R-42");
    await expect(verifySessionToken(token)).resolves.toEqual({ adminRiderId: "R-42" });
  });

  it("라운드트립 회귀: 모든 payload 길이(base64url len%4 전 버킷)에서 복원", async () => {
    // 과거 b64urlToBytes 패딩 버그는 payload base64url 길이 % 4 === 2 일 때만
    // atob 가 throw → verify 가 null → 미들웨어가 /dashboard 를 조용히 /login 으로
    // 되돌렸다(특정 길이의 라이더 ID 만 로그인 불가, 무증상). ID 길이를 넓게 훑어 재발 차단.
    for (let n = 1; n <= 64; n++) {
      const rid = "RIDER_" + "X".repeat(n);
      const token = await createSessionToken(rid);
      await expect(verifySessionToken(token)).resolves.toEqual({ adminRiderId: rid });
    }
  });

  it("서명 위조 → null", async () => {
    const token = await createSessionToken("R-1");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    await expect(verifySessionToken(tampered)).resolves.toBeNull();
  });

  it("payload 변조(시그니처 불일치) → null", async () => {
    const token = await createSessionToken("R-1");
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ rid: "R-999", iat: 0, exp: 9e9 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await expect(verifySessionToken(`${forgedBody}.${sig}`)).resolves.toBeNull();
  });

  it("다른 SESSION_SECRET 로는 검증 실패 → null", async () => {
    const token = await createSessionToken("R-1");
    vi.stubEnv("SESSION_SECRET", "completely-different-secret-key-99");
    await expect(verifySessionToken(token)).resolves.toBeNull();
  });

  it("빈/형식오류 토큰 → null", async () => {
    await expect(verifySessionToken(undefined)).resolves.toBeNull();
    await expect(verifySessionToken("")).resolves.toBeNull();
    await expect(verifySessionToken("no-dot")).resolves.toBeNull();
  });
});

describe("constantTimeEqual", () => {
  it("동일/상이/길이불일치", () => {
    expect(constantTimeEqual("1234", "1234")).toBe(true);
    expect(constantTimeEqual("1234", "1235")).toBe(false);
    expect(constantTimeEqual("1234", "123")).toBe(false);
  });
});
