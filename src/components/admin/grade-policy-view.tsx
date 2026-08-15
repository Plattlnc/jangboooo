import type { GradeStatus } from "@/app/admin/(panel)/grade-policy/_lib/grade-policy";

// 신규 등급제 현황 — 모바일 단일 화면. 정책(정적) + 우리 실적(라이브) 한눈에.
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

function gradeColor(g: string): string {
  if (g === "마스터") return "text-jb-ink";
  if (g === "다이아") return "text-jb-indigo";
  if (g === "골드") return "text-jb-amber";
  if (g === "실버") return "text-jb-ink-mute";
  return "text-jb-orange";
}

export function GradePolicyView({ s }: { s: GradeStatus }) {
  const rows = [
    { g: "마스터", set: "8+", adapt: "0개", official: "2개 이하" },
    { g: "다이아", set: "5+", adapt: "1개 이하", official: "3개 이하" },
    { g: "골드", set: "3+", adapt: "2개 이하", official: "6개 이하" },
    { g: "실버", set: "2+", adapt: "3개 이하", official: "12개 이하" },
    { g: "브론즈", set: "1+", adapt: "—", official: "—" },
  ];
  const remaining = s.days.filter((d) => !d.done && d.date >= s.weekStart).length;

  return (
    <div className="mx-auto max-w-[520px] px-4 pb-10 pt-2">
      {/* 헤더 */}
      <div className="mb-3">
        <span className="rounded-[6px] bg-jb-indigo-tint px-2 py-[3px] text-[11px] font-bold text-jb-indigo">배민커넥트비즈클럽 · 신규 등급제</span>
        <h1 className="mt-2 text-[21px] font-black tracking-[-0.02em] text-jb-ink">우리 등급, 지금 어떻게 되나</h1>
        <p className="mt-0.5 text-[12px] text-jb-ink-mute">인천서구8B · 이번 주 {md(s.weekStart)}~{md(s.weekEnd)} 기준</p>
      </div>

      {/* 결론 (깔끔·무배경) */}
      <section className="rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11.5px] font-bold text-jb-ink-mute">이번 주 적응기준 등급</div>
            <div className={`mt-0.5 text-[32px] font-black leading-none ${gradeColor(s.adaptationGrade)}`}>{s.adaptationGrade}</div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${s.missedThisWeek > 0 ? "bg-jb-red-tint text-jb-red" : "bg-jb-green-tint text-jb-green"}`}>
            미달성 {s.missedThisWeek}개
          </span>
        </div>
        <div className="my-[14px] h-px bg-jb-line" />
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-[10.5px] text-jb-ink-mute">세트 수</div><div className="mt-0.5 text-[15px] font-black text-jb-green">{s.setCount ?? "—"}</div></div>
          <div><div className="text-[10.5px] text-jb-ink-mute">이번주 미달성</div><div className={`mt-0.5 text-[15px] font-black ${s.missedThisWeek > 0 ? "text-jb-red" : "text-jb-green"}`}>{s.missedThisWeek}</div></div>
          <div><div className="text-[10.5px] text-jb-ink-mute">수락률</div><div className="mt-0.5 text-[15px] font-black text-jb-green">{s.acceptance ?? "—"}%</div></div>
        </div>
      </section>

      {/* 돈 반영 타임라인 — 핵심 오해 방지 */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">💡 그래서 다음 주에 돈 깎이나?</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-jb-ink-soft"><b className="text-jb-ink">당장은 아니에요.</b> 신규 등급(위 실버)은 화면에 <b>표시·평가</b>만 되고, 실제 <b>보너스 관리비(돈)</b>에 반영되는 시점은 아래처럼 단계적이에요.</p>
        <div className="mt-3 space-y-2.5">
          <div className="flex gap-2.5">
            <span className="grid h-6 w-[52px] shrink-0 place-items-center rounded-[8px] bg-jb-green-tint text-[12px] font-black text-jb-green">8/19</span>
            <p className="text-[12px] leading-snug text-jb-ink-soft"><b className="text-jb-ink">정산 = 기존 등급 그대로.</b> 이번 주 미달성이 있어도 돈은 예전(마스터) 기준으로 나와요.</p>
          </div>
          <div className="flex gap-2.5">
            <span className="grid h-6 w-[52px] shrink-0 place-items-center rounded-[8px] bg-jb-orange-tint text-[12px] font-black text-jb-orange">8/26</span>
            <p className="text-[12px] leading-snug text-jb-ink-soft"><b className="text-jb-ink">여기부터 신규 등급이 돈에 반영</b>되기 시작해요.</p>
          </div>
          <div className="flex gap-2.5">
            <span className="grid h-6 w-[52px] shrink-0 place-items-center rounded-[8px] bg-jb-indigo-tint text-[12px] font-black text-jb-indigo">9/2</span>
            <p className="text-[12px] leading-snug text-jb-ink-soft"><b className="text-jb-ink">정식 기준(최근 4주 평균)</b>으로 전환 → 한 주 삐끗은 4주 평균으로 흡수돼 완화돼요.</p>
          </div>
        </div>
        <div className="mt-3 rounded-[11px] bg-jb-surface p-3 text-[11.5px] leading-relaxed text-jb-ink-soft">
          지금 실버로 보이는 건 <b className="text-jb-ink">적응기간(8/12~9/1)</b>이라 <b>그 주 1주</b>만 보고 평가하기 때문(마스터=미달성 0개). 9/2 정식(4주 합산)부턴 <b>마스터 = 4주 미달성 2개까지</b> 허용이라, 평소 실력이면 다시 마스터 회복 가능해요.
        </div>
      </section>

      {/* 이번 주 슬롯 현황 (라이브) */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">이번 주 슬롯 달성</h2>
        <p className="mt-0.5 text-[11.5px] text-jb-ink-mute">4피크 × 7일 = 28슬롯 · 100% 미만이면 미달성</p>
        <div className="mt-3 overflow-hidden rounded-[10px] border border-jb-line">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-jb-surface text-jb-ink-mute">
                <th className="px-2 py-1.5 text-left font-bold">날짜</th>
                <th className="px-1 py-1.5 font-bold">아침</th>
                <th className="px-1 py-1.5 font-bold">오후</th>
                <th className="px-1 py-1.5 font-bold">저녁</th>
                <th className="px-1 py-1.5 font-bold">심야</th>
                <th className="px-1 py-1.5 font-bold">미달</th>
              </tr>
            </thead>
            <tbody>
              {s.days.map((d) => (
                <tr key={d.date} className={`border-t border-jb-line ${d.missed > 0 && d.done ? "bg-jb-red-tint/40" : ""}`}>
                  <td className="px-2 py-1.5 text-left font-semibold text-jb-ink-soft">{md(d.date)} {d.dow}</td>
                  {d.cells.map((c) => (
                    <td key={c.key} className={`px-1 py-1.5 text-center tabular-nums ${c.status === "miss" ? "font-black text-jb-red" : c.status === "hit" ? "text-jb-green" : "text-jb-ink-mute"}`}>
                      {c.pct != null && c.status !== "none" ? `${c.pct}%` : "·"}
                    </td>
                  ))}
                  <td className={`px-1 py-1.5 text-center font-black ${d.missed > 0 && d.done ? "text-jb-red" : "text-jb-ink-mute"}`}>{d.done ? d.missed : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-jb-line bg-jb-surface font-black text-jb-ink">
                <td className="px-2 py-1.5 text-left" colSpan={5}>이번 주 미달성 합계</td>
                <td className={`px-1 py-1.5 text-center ${s.missedThisWeek > 0 ? "text-jb-red" : "text-jb-green"}`}>{s.missedThisWeek}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {remaining > 0 ? (
          <div className="mt-3 rounded-[11px] bg-jb-red-tint p-3 text-[11.5px] font-semibold leading-relaxed text-jb-red">
            ⚠️ 남은 {remaining}일({remaining * 4}슬롯)에서 1개라도 더 놓치면 미달성 4개 → <b>보너스 관리비 그 주 미지급</b> + 등급 추락. 남은 슬롯 전부 달성이 목표!
          </div>
        ) : null}
      </section>

      {/* 등급 기준 */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">신규 등급 기준</h2>
        <p className="mt-0.5 text-[11.5px] text-jb-ink-mute">세트 + 미달성 슬롯 동시 충족. 우리 세트 16개라 <b>미달성이 등급 결정</b>.</p>
        <div className="mt-3 overflow-hidden rounded-[10px] border border-jb-line">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-jb-surface text-jb-ink-mute">
                <th className="px-2.5 py-2 text-left font-bold">등급</th>
                <th className="px-1 py-2 font-bold">세트</th>
                <th className="px-1 py-2 font-bold">적응<br /><span className="text-[10px] font-medium">(금주)</span></th>
                <th className="px-1 py-2 font-bold">정식<br /><span className="text-[10px] font-medium">(4주)</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hi = r.g === s.adaptationGrade;
                return (
                  <tr key={r.g} className={`border-t border-jb-line ${hi ? "bg-jb-indigo-tint/50" : ""}`}>
                    <td className={`px-2.5 py-2 text-left font-black ${gradeColor(r.g)}`}>{r.g}{hi ? " ←지금" : ""}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-jb-ink-soft">{r.set}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-jb-ink-soft">{r.adapt}</td>
                    <td className="px-1 py-2 text-center tabular-nums text-jb-ink-soft">{r.official}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-jb-ink-mute">정식(4주) 기준 우리 최근 4주 미달성 합 = <b className="text-jb-ink-soft">{s.recent4Missed ?? "—"}개</b> → <b className={gradeColor(s.officialGrade)}>{s.officialGrade}</b></p>
      </section>

      {/* 미달성 시 잃는 순서 */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">미달성이 생기면 잃는 순서</h2>
        <ul className="mt-2.5 space-y-2 text-[12px] leading-snug text-jb-ink-soft">
          <li className="flex gap-2"><span className="font-black text-jb-red">1.</span><span><b className="text-jb-ink">초과달성 보너스</b> — 28슬롯 <b>전부 달성</b>해야 지급. 1개만 놓쳐도 그 주 미지급 (가장 먼저 잃음)</span></li>
          <li className="flex gap-2"><span className="font-black text-jb-amber">2.</span><span><b className="text-jb-ink">보너스 관리비</b> — 미달성 3개까지 OK, <b>4개 이상이면 그 주 미지급</b></span></li>
          <li className="flex gap-2"><span className="font-black text-jb-green">3.</span><span><b className="text-jb-ink">등급</b> — 적응기간엔 그 주 미달성 수, 정식엔 4주 합산. 가장 나중에 영향</span></li>
        </ul>
      </section>

      {/* 보너스 단가 */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">보너스 관리비 등급별 단가</h2>
        <div className="mt-2.5 space-y-0">
          {[["마스터", "450원"], ["다이아", "350원"], ["골드", "150원"], ["실버", "50원"], ["브론즈", "0원"]].map(([g, p]) => (
            <div key={g} className={`flex items-center justify-between border-b border-jb-line py-2 text-[13px] last:border-b-0 ${g === s.adaptationGrade ? "font-black" : ""}`}>
              <span className={`font-bold ${gradeColor(g)}`}>{g}{g === s.adaptationGrade ? " ←지금" : ""}</span>
              <span className="tabular-nums text-jb-ink">건당 {p}</span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-jb-ink-mute">지급 조건: 수락률 80%+ &amp; 달성슬롯 25개+ (미달성 3개 이하). <b className="text-jb-ink-soft">실버(50원)는 마스터(450원)의 1/9</b>이라 등급이 내려가면 보너스가 크게 줄어요.</p>
      </section>

      {/* 최근 실적 */}
      {s.history.length ? (
        <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
          <h2 className="text-[15px] font-black text-jb-ink">최근 주차 실적</h2>
          <div className="mt-2.5 overflow-hidden rounded-[10px] border border-jb-line">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="bg-jb-surface text-jb-ink-mute">
                  <th className="px-2 py-1.5 text-left font-bold">주차</th>
                  <th className="px-1 py-1.5 font-bold">세트</th>
                  <th className="px-1 py-1.5 font-bold">슬롯</th>
                  <th className="px-1 py-1.5 font-bold">미달</th>
                  <th className="px-1 py-1.5 font-bold">수락률</th>
                </tr>
              </thead>
              <tbody>
                {s.history.slice(0, 6).map((h) => (
                  <tr key={h.weekStart} className="border-t border-jb-line">
                    <td className="px-2 py-1.5 text-left font-semibold text-jb-ink-soft">{md(h.weekStart)}~{md(h.weekEnd)}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums text-jb-ink-soft">{h.setCount ?? "—"}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums text-jb-ink-soft">{h.achieved}/{h.total}</td>
                    <td className={`px-1 py-1.5 text-center tabular-nums font-bold ${(h.missed ?? 0) > 0 ? "text-jb-red" : "text-jb-green"}`}>{h.missed}</td>
                    <td className="px-1 py-1.5 text-center tabular-nums text-jb-ink-soft">{h.acceptance}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* 일정 */}
      <section className="mt-3 rounded-[16px] border border-jb-line bg-jb-card p-[18px]">
        <h2 className="text-[15px] font-black text-jb-ink">적용 일정</h2>
        <div className="mt-2.5 space-y-2 text-[12px] text-jb-ink-soft">
          <div><b className="text-jb-indigo">8/12</b> · 신규 SLA 도입 (9~24시, 세트당 750→680건, 시간외 관리비 100원)</div>
          <div><b className="text-jb-indigo">8/19</b> · 신규 등급 첫 평가·표시 (정산 돈은 기존 등급)</div>
          <div><b className="text-jb-indigo">8/26</b> · 보너스 관리비에 신규 등급 반영 시작</div>
          <div><b className="text-jb-indigo">9/2</b> · 정식 기준(최근 4주 합산) 전환</div>
        </div>
      </section>

      <p className="mt-4 text-center text-[10.5px] text-jb-ink-mute">출처: 배민커넥트비즈클럽 신규 SLA·등급제 안내문 + 달성현황·주정산서 자동 수집분</p>
    </div>
  );
}
