import type { Metadata } from "next";
import { LoginFlow } from "@/components/auth/login-flow";

export const metadata: Metadata = {
  title: "로그인 · 배달장부2",
};

// 02 로그인/본인인증. 화면 흐름은 LoginFlow(client)가 담당.
export default function LoginPage() {
  return <LoginFlow />;
}
