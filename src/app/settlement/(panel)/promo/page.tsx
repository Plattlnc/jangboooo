import { Megaphone, Check } from "lucide-react";

export const dynamic = "force-dynamic";

// 자사 프로모션 정산 — 라이더별 자사 프로모션(주간 보너스 등) 적립 집계 → 지급 정산.
// 현재: 프로모션 종류·적립 규칙·기간·양식 확정 대기.
const PLAN = [
  "라이더별 자사 프로모션 적립액 자동 집계(주간 보너스 등)",
  "프로모션 종류별 구분 표기",
  "기간(일·주·월) 선택 조회 + 라이더 검색",
  "정산 내역 CSV 내보내기",
];

export default function PromoSettlementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">자사 프로모션</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">
          라이더별 자사 프로모션 적립 집계 → 지급 정산
        </p>
      </div>

      <div className="rounded-[16px] border border-jb-line bg-jb-card p-8 shadow-[var(--toss-shadow)]">
        <div className="grid size-12 place-items-center rounded-[14px] bg-jb-indigo-tint text-jb-indigo">
          <Megaphone size={24} />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold text-jb-ink">프로모션 규칙 확정 후 자동 생성됩니다</h2>
        <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-jb-ink-mute">
          집계할 자사 프로모션 종류와 적립 규칙(예: 주간 보너스 임계값·단가), 조회 기간·표시 양식을 알려주시면
          일일 정산과 동일한 방식으로 표·집계·다운로드까지 연결하겠습니다.
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
