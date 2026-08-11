import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SettlementLoginForm } from "@/components/settlement/settlement-login-form";
import { isSettlementSession } from "@/lib/auth/settlement-cookies";

export const metadata: Metadata = {
  title: "정산 로그인 · 슬라이더",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// 정산팀 로그인. 이미 세션이 있으면 정산 홈으로.
export default async function SettlementLoginPage() {
  if (await isSettlementSession()) redirect("/settlement");
  return (
    <div className={`geist-admin font-pretendard ${GeistSans.variable} ${GeistMono.variable} min-h-dvh bg-jb-surface`}>
      <SettlementLoginForm />
    </div>
  );
}
