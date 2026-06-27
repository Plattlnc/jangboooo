import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/demo";

// 진입점: 데모 모드(#13)면 대시보드로, 아니면 로그인.
// (세션 가드/자동 라우팅은 backend Auth 도착 후 정교화)
export default function RootPage() {
  redirect(DEMO_MODE ? "/dashboard" : "/login");
}
