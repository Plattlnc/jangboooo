import { fetchMonthlySettlement } from "@/app/settlement/_lib/monthly";
import { loadRiderNotes } from "@/app/settlement/_lib/notes";
import { kstMonth, isValidYm } from "@/app/settlement/_lib/dates";
import { isRidersUnlocked } from "@/lib/auth/settlement-cookies";
import { MonthlyStatementView } from "@/components/settlement/monthly-view";
import { RidersUnlockForm } from "@/components/settlement/riders-unlock-form";
import { DataPulse } from "@/components/settlement/data-pulse";

export const dynamic = "force-dynamic";

// 정산서(세무사용) — 월 소득정산서. 라이더별 × 주차별(수~화) 세전 소득(배달처리비 + 기타/인센티브) 통합.
// 주민등록번호 포함 → 2차 비밀번호 잠금(라이더 설정과 동일 게이트).
export default async function StatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const thisMonth = kstMonth();
  const ym = isValidYm(sp.month) ? sp.month : thisMonth;

  if (!(await isRidersUnlocked())) {
    return (
      <RidersUnlockForm title="정산서 (세무사용)" subtitle="주민등록번호가 포함되어 2차 비밀번호가 필요합니다." />
    );
  }

  const [data, notes] = await Promise.all([fetchMonthlySettlement(ym), loadRiderNotes()]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">정산서</h1>
        <span className="rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[11px] font-bold leading-none text-jb-indigo">세무사용</span>
        <span className="ml-auto">
          <DataPulse source="daily" label="정산 원천 데이터" cadence="매일 08:00 자동 수집 (전일분)" />
        </span>
      </div>
      <MonthlyStatementView data={data} thisMonth={thisMonth} notes={notes} />
    </div>
  );
}
