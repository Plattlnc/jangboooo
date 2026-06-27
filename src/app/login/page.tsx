import type { Metadata } from "next";
import { RiderLoginForm } from "@/components/auth/rider-login-form";

export const metadata: Metadata = {
  title: "로그인 · 배달장부2",
};

// #20 로그인: 라이더 ID + 비밀번호(4자리). 카카오/본인인증 흐름 폐기.
export default function LoginPage() {
  return <RiderLoginForm />;
}
