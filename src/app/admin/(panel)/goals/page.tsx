import { getAdminCenterGoals } from "@/lib/supabase/admin-queries";
import { fmtCount, fmtKDate, fmtShortDate } from "@/components/admin/format";
import type { CenterPeakGoalRow } from "@/types/database";

export const dynamic = "force-dynamic";

// 협력사 공동목표 — 오늘(영업일) 4피크 현황 + 최근 7일 이력. 소스: center_peak_goals(Looker).
const PEAK_ORDER: { key: CenterPeakGoalRow["peak_key"]; label: string }[] = [
  { key: "ml", label: "아침점심" },
  { key: "pl", label: "오후논피크" },
  { key: "d", label: "저녁피크" },
  { key: "pd", label: "심야논피크" },
];

export default async function AdminGoalsPage() {
  const rows = await getAdminCenterGoals(7);

  const byDate = new Map<string, CenterPeakGoalRow[]>();
  for (const r of rows) {
    const list = byDate.get(r.snapshot_date);
    if (list) list.push(r);
    else byDate.set(r.snapshot_date, [r]);
  }
  const dates = [...byDate.keys()].sort().reverse();
  const latestDate = dates[0];
  const latest = latestDate ? byDate.get(latestDate) ?? [] : [];
  const history = dates.slice(1);

  const pick = (list: CenterPeakGoalRow[], key: CenterPeakGoalRow["peak_key"]) =>
    list.find((r) => r.peak_key === key);

  return (
    <div className="px-3.5 py-[9px]">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-black text-jb-ink">
          공동목표 <span className="text-jb-indigo">· 협력사 4피크</span>
        </span>
        {latestDate ? (
          <span className="tnum text-[10px] font-semibold text-jb-ink-mute">{fmtKDate(latestDate)} 기준</span>
        ) : null}
      </div>

      {/* 오늘 현황 */}
      <div className="mt-1.5 border border-jb-line bg-white px-[13px] py-[9px] shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        {latest.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-4 text-center">
            <span className="text-[12.5px] font-bold text-jb-ink-soft">아직 집계된 공동목표가 없어요</span>
            <span className="text-[11px] text-jb-ink-mute">수집되면 자동으로 표시돼요</span>
          </div>
        ) : (
          PEAK_ORDER.map(({ key, label }) => {
            const g = pick(latest, key);
            const current = g?.current ?? null;
            const goal = g?.goal ?? null;
            const pct = g?.pct ?? null;
            const over = (pct ?? 0) >= 100;
            const remaining = goal != null && current != null ? goal - current : null;
            return (
              <div key={key} className="mb-1.5 last:mb-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="w-[74px] shrink-0 text-[13px] font-black text-jb-ink">{label}</span>
                  <span className="tnum text-[15px] font-black" style={{ color: over ? "#4F6AF5" : "#E8590C" }}>
                    {current == null ? "—" : fmtCount(current)}
                  </span>
                  <span className="tnum text-[12px] font-bold text-jb-ink-mute">
                    / {goal == null ? "—" : `${fmtCount(goal)}건`}
                  </span>
                  <span className="tnum text-[11.5px] font-black text-jb-ink-mute">
                    {pct == null ? "—" : `${pct}%`}
                  </span>
                  {remaining != null && pct != null ? (
                    <span
                      className={
                        "tnum ml-auto whitespace-nowrap text-[11.5px] font-black " +
                        (remaining <= 0 ? "text-jb-green" : "text-jb-indigo")
                      }
                    >
                      {remaining <= 0 ? "목표 달성" : `${fmtCount(remaining)}건 남음`}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 h-[7px] overflow-hidden bg-jb-track">
                  <div
                    className="h-full"
                    style={{ width: `${Math.min(pct ?? 0, 100)}%`, background: over ? "#4F6AF5" : "#E8590C" }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 최근 이력 */}
      {history.length > 0 ? (
        <div className="mt-2">
          <div className="mb-1.5 px-0.5">
            <span className="text-xs font-black text-jb-ink">최근 이력</span>
            <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">달성/목표(달성률)</span>
          </div>
          <div className="border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-x-2 border-b border-jb-line-soft px-3 py-1.5 text-[10px] font-bold text-jb-ink-mute">
              <span className="w-[52px]">날짜</span>
              {PEAK_ORDER.map((p) => (
                <span key={p.key} className="text-right">{p.label}</span>
              ))}
            </div>
            {history.map((date) => {
              const list = byDate.get(date) ?? [];
              return (
                <div
                  key={date}
                  className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] items-center gap-x-2 border-b border-jb-line-soft px-3 py-2 last:border-b-0"
                >
                  <span className="tnum w-[52px] text-[11.5px] font-bold text-jb-ink">{fmtShortDate(date)}</span>
                  {PEAK_ORDER.map(({ key }) => {
                    const g = pick(list, key);
                    return (
                      <span key={key} className="text-right">
                        <span className="tnum block text-[11.5px] font-black text-jb-ink">
                          {g?.current == null ? "—" : fmtCount(g.current)}
                          <span className="font-bold text-jb-ink-mute">/{g?.goal == null ? "—" : fmtCount(g.goal)}</span>
                        </span>
                        <span
                          className={
                            "tnum block text-[9.5px] font-black " +
                            ((g?.pct ?? 0) >= 100 ? "text-jb-indigo" : "text-jb-ink-mute")
                          }
                        >
                          {g?.pct == null ? "—" : `${g.pct}%`}
                        </span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        공동목표는 배민 달성현황(Looker) 소스 기준이며 수집 지연이 있을 수 있어요.
      </div>
    </div>
  );
}
