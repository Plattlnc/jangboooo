import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { isAdminSession } from "@/lib/auth/admin-cookies";

export const metadata: Metadata = {
  title: "관리자 로그인 · 배달장부2",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// 관리자 로그인. 이미 세션이 있으면 홈으로.
export default async function AdminLoginPage() {
  if (await isAdminSession()) redirect("/admin");
  return <AdminLoginForm />;
}
