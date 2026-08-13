import { loadPromoRules } from "@/app/settlement/_lib/promo-rules";
import { kstMonth, isValidYm, monthWeeks } from "@/app/settlement/_lib/dates";
import { PromoSettings } from "@/components/settlement/promo-settings";

export const dynamic = "force-dynamic";

// 자사 프로모션 설정 — 주차별 초과 기준·단가 규칙 입력. ?month=YYYY-MM.
export default async function PromoSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const thisMonth = kstMonth();
  const ym = isValidYm(sp.month) ? sp.month : thisMonth;
  const [rules, weeks] = [await loadPromoRules(), monthWeeks(ym)];
  return <PromoSettings ym={ym} thisMonth={thisMonth} weeks={weeks} rules={rules} />;
}
