// 홈 · SLA 대시보드 (시안 재설계 · 실데이터 연동).
// 서버에서 오늘/주간 두 기간을 조회 → 뷰모델로 변환 → 탭 전환은 클라이언트(HomeScreen).
// env(Supabase service_role) 미설정 시 getDashboardData 가 결정적 목으로 폴백.

import { getDashboardData } from "@/app/(rider)/_lib/queries";
import { getRiderProfile } from "@/app/(rider)/_lib/rider-profile";
import { getMyGrade } from "@/app/(rider)/_lib/grade";
import { getFeaturedNotice } from "@/lib/notices";
import { HomeScreen } from "@/components/screens/home-screen";
import { toHomeMetrics, toHomeProfile, homeDateShort } from "@/components/screens/home-view";

// 매 요청 최신 스냅샷 반영(스크래퍼 1분 주기). 정적 캐시 방지.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // getRiderProfile 은 React cache — 레이아웃(드로어)과 같은 요청 내 재사용이라 추가 조회 없음.
  const [today, week, riderProfile, grade, featured] = await Promise.all([
    getDashboardData("today"),
    getDashboardData("week"),
    getRiderProfile(),
    getMyGrade(),
    getFeaturedNotice(),
  ]);

  return (
    <HomeScreen
      today={toHomeMetrics(today, "today")}
      week={toHomeMetrics(week, "week")}
      todayDateShort={homeDateShort(today, "today")}
      weekDateShort={homeDateShort(week, "week")}
      profile={toHomeProfile(today, riderProfile.avatarUrl, grade.tier)}
      featured={featured ? { id: featured.id, title: featured.title, excerpt: featured.excerpt ?? "" } : null}
    />
  );
}
