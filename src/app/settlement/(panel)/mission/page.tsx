import { Building2, Check } from "lucide-react";

export const dynamic = "force-dynamic";

// 본사 미션 정산 — 라이더별 본사 미션 지급액(mission_krw) 집계 → 세금 공제 후 지급액.
// 현재: 정산 규칙(공제·기간·양식) 확정 대기. 데이터(rider_daily_fees.mission_krw)는 이미 수집됨.
const PLAN = [
  "라이더별 본사 미션 지급액(세전) 자동 집계",
  "원천세 3.3% · 고용산재 1.8% 공제 후 지급액 산출",
  "기간(일·주·월) 선택 조회 + 라이더 검색",
  "정산 내역 CSV 내보내기",
];

export default function MissionSettlementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">본사 미션</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">
          라이더별 본사 미션 지급액 집계 → 세금 공제 후 지급 정산
        </p>
      </div>

      <div className="rounded-[16px] border border-jb-line bg-jb-card p-8 shadow-[var(--toss-shadow)]">
        <div className="grid size-12 place-items-center rounded-[14px] bg-jb-indigo-tint text-jb-indigo">
          <Building2 size={24} />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold text-jb-ink">정산 규칙 확정 후 자동 생성됩니다</h2>
        <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-jb-ink-mute">
          본사 미션 지급액은 이미 라이더별·일별로 수집되어 있습니다. 공제 방식(원천세·고용산재)·조회 기간·표시 양식만
          알려주시면 일일 정산과 동일한 방식으로 표·집계·다운로드까지 연결하겠습니다.
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
