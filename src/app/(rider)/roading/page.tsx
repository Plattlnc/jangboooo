// ROADING 교통사고 접수. 실제 ROADING 시스템(loading-app-two.vercel.app)을 iframe 으로 임베드.
// 라이더 정보(name, phone)는 server 에서 fetch → client 임베드 컴포넌트에 props 로 전달.

import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { RoadingEmbed } from "@/components/screens/roading-embed";

// 세션 기반(매 요청 fresh).
export const dynamic = "force-dynamic";

export default async function RoadingPage() {
  const profile = await getRiderProfile();
  return (
    <RoadingEmbed
      riderId={profile.uid}
      riderName={profile.name}
      riderPhone={profile.phone}
    />
  );
}
