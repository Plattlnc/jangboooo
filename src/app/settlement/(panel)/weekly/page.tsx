import { FileSpreadsheet, Check } from "lucide-react";

export const dynamic = "force-dynamic";

// 주정산서(#2) — 라이더별 수~화 주간 배달처리비 + 프로모션(기타비용) 합산 → 세무사 제출용.
// 현재: 양식 확정 대기(사용자 기존 엑셀 공유 예정). 데이터 기반(rider_daily_fees)은 준비됨.
const PLAN = [
  "라이더별 수요일~화요일(1주) 배달처리비(세전) 자동 합산",
  "자사 프로모션 비용(기타비용) 합산 — 출석·버닝·주간 프로모션",
  "라이더별 총 지급 비용 = 배달처리비 + 기타비용",
  "세무사 제출 양식(엑셀) 그대로 다운로드",
];

export default function WeeklySettlementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">정산서</h1>
          <span className="rounded-[6px] bg-jb-indigo-tint px-1.5 py-[3px] text-[11px] font-bold leading-none text-jb-indigo">세무사용</span>
        </div>
        <p className="mt-1 text-[13px] text-jb-ink-mute">
          수~화 주간 라이더별 배달처리비 + 기타비용 합산 → 세무사 제출용 정산서
        </p>
      </div>

      <div className="rounded-[16px] border border-jb-line bg-jb-card p-8 shadow-[var(--toss-shadow)]">
        <div className="grid size-12 place-items-center rounded-[14px] bg-jb-indigo-tint text-jb-indigo">
          <FileSpreadsheet size={24} />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold text-jb-ink">양식 확정 후 자동 생성됩니다</h2>
        <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-jb-ink-mute">
          일일 정산에 쓰는 배달처리비 데이터가 이미 라이더별·일별로 수집되어 있어, 주간 합산은 바로 가능합니다.
          기존에 세무사에게 보내던 엑셀 양식을 공유해 주시면 셀·시트 구조·합계 방식까지 동일하게 자동 생성/다운로드로 연결하겠습니다.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          {PLAN.map((t) => (
            <div key={t} className="flex items-start gap-2.5 text-[13.5px] text-jb-ink-soft">
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-jb-green-tint text-jb-green">
                <Check size={11} strokeWidth={3} />
              </span>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
