import { redirect } from "next/navigation";

// 진입점 → 로그인. (세션 가드/자동 라우팅은 backend Auth 도착 후 정교화)
export default function RootPage() {
  redirect("/login");
}
