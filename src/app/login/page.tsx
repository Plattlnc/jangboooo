import type { Metadata } from "next";
import { RiderLoginForm } from "@/components/auth/rider-login-form";
import { CONTRACT_TERMINATED_MESSAGE } from "@/lib/contract";

export const metadata: Metadata = {
  title: "로그인 · 슬라이더",
};

// #20 로그인: 라이더 ID + 비밀번호(4자리). 카카오/본인인증 흐름 폐기.
// ?blocked=contract → 계약종료 라이더 세션 차단 진입: 안내 문구 초기 표시 + 자동 로그인 스킵.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string }>;
}) {
  const sp = await searchParams;
  const blocked = sp.blocked === "contract";
  return <RiderLoginForm initialError={blocked ? CONTRACT_TERMINATED_MESSAGE : undefined} blocked={blocked} />;
}
