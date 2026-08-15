import { fetchGradeStatus } from "@/app/admin/(panel)/grade-policy/_lib/grade-policy";
import { GradePolicyView } from "@/components/admin/grade-policy-view";

export const dynamic = "force-dynamic";

// 신규 등급제 현황 — 이번 주 공동목표(슬롯) 달성·미달성 + 정책 요약, 모바일 단일 화면.
export default async function GradePolicyPage() {
  const s = await fetchGradeStatus();
  return <GradePolicyView s={s} />;
}
