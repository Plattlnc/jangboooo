import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
  createSessionToken,
} from "@/lib/auth/session";

// 관리자 세션 토큰 — 라이더 토큰과 상호 오인 불가 + 위변조 거부 검증.

beforeEach(() => vi.stubEnv("SESSION_SECRET", "test-secret-至少十六자이상-0123456789"));
afterEach(() => vi.unstubAllEnvs());

describe("createAdminSessionToken / verifyAdminSessionToken", () => {
  it("라운드트립: 발급 토큰은 유효", async () => {
    const token = await createAdminSessionToken();
    await expect(verifyAdminSessionToken(token)).resolves.toBe(true);
  });

  it("서명 위조 → false", async () => {
    const token = await createAdminSessionToken();
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    await expect(verifyAdminSessionToken(tampered)).resolves.toBe(false);
  });

  it("라이더 토큰은 관리자 토큰으로 인정되지 않음", async () => {
    const riderToken = await createSessionToken("R-1");
    await expect(verifyAdminSessionToken(riderToken)).resolves.toBe(false);
  });

  it("빈/형식 오류 토큰 → false", async () => {
    await expect(verifyAdminSessionToken(undefined)).resolves.toBe(false);
    await expect(verifyAdminSessionToken("")).resolves.toBe(false);
    await expect(verifyAdminSessionToken("no-dot")).resolves.toBe(false);
  });

  it("adm 플래그 위조(body 교체, 시그니처 불일치) → false", async () => {
    const token = await createAdminSessionToken();
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ adm: true, iat: 0, exp: 9e9 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    await expect(verifyAdminSessionToken(`${forgedBody}.${sig}`)).resolves.toBe(false);
  });
});
