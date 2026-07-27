// ROADING 교통사고 접수. 실제 ROADING 시스템(loading-app-two.vercel.app)을 iframe 으로 임베드.
// 라이더 정보(name, phone)는 server 에서 fetch → client 임베드 컴포넌트에 props 로 전달.

import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { RoadingEmbed } from "@/components/screens/roading-embed";

// 세션 기반(매 요청 fresh).
export const dynamic = "force-dynamic";

export default async function RoadingPage() {
  const profile = await getRiderProfile();
  // 목 프로필(uid "MOCK-*")은 데모 — ROADING 운영 데이터 오염 방지용으로 표기 전달.
  const isDemo = profile.uid.startsWith("MOCK-");
  // 내정보에서 등록한 실사용자 정보가 있으면 계정(스크래퍼) 정보보다 우선.
  return (
    <RoadingEmbed
      riderId={profile.uid}
      riderName={profile.realName ?? profile.name}
      riderPhone={profile.realPhone ?? profile.phone}
      riderPlate={profile.plate}
      riderModel={profile.bikeModel}
      isDemo={isDemo}
    />
  );
}
