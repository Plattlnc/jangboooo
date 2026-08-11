import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminSession } from "@/lib/auth/admin-cookies";

export const metadata: Metadata = {
  title: "관리자 로그인 · 슬라이더",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// 관리자 로그인. 이미 세션이 있으면 홈으로.
export default async function AdminLoginPage() {
  if (await isAdminSession()) redirect("/admin");
  return (
    <div className={`geist-admin ${GeistSans.variable} ${GeistMono.variable}`}>
      <AdminLoginForm />
    </div>
  );
}
