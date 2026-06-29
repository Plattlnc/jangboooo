// ROADING 접수 내역. 실제 ROADING 시스템(loading-app-two.vercel.app/history)을 iframe 임베드.
// 데이터(accidents)는 ROADING Supabase 소속 → /roading(사고접수)와 동일하게 임베드로 노출.
// 라이더 정보(name, phone)는 server 에서 fetch → 임베드 컴포넌트에 props 로 전달(동일 anon 세션 공유).

import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { RoadingEmbed } from "@/components/screens/roading-embed";

// 세션 기반(매 요청 fresh).
export const dynamic = "force-dynamic";

export default async function RoadingHistoryPage() {
  const profile = await getRiderProfile();
  // 목 프로필(uid "MOCK-*")은 데모 — ROADING 운영 데이터 오염 방지용 표기 전달.
  const isDemo = profile.uid.startsWith("MOCK-");
  return (
    <RoadingEmbed
      path="/history"
      title="ROADING 접수 내역"
      riderId={profile.uid}
      riderName={profile.name}
      riderPhone={profile.phone}
      isDemo={isDemo}
    />
  );
}
