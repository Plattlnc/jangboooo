"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Save, Check } from "lucide-react";
import type { SettlementRider } from "@/app/settlement/_lib/notes";
import { saveRiderDeductions } from "@/actions/deductions";
import { TerminatedBadge } from "./terminated-badge";

// 차감 정산 — 라이더별 시간제보험료 차감액 입력/저장. 금요일 정산 시 별도 차감(분류 관리).
const won = (n: number) => n.toLocaleString("ko-KR");

export function DeductionView({
  riders,
  deductions,
  scraped,
  latestDate,
  terminated,
}: {
  riders: SettlementRider[];
  deductions: Record<string, number>;
  scraped: Record<string, number>;
  latestDate: string | null;
  terminated?: string[];
}) {
  // 입력 편의를 위해 문자열 맵으로 보관(빈칸 허용).
  const initial = useMemo(() => {
    const m: Record<string, string> = {};
    for (const [k, v] of Object.entries(deductions)) m[k] = String(v);
    return m;
  }, [deductions]);

  const termSet = useMemo(() => new Set(terminated ?? []), [terminated]);
  const [map, setMap] = useState<Record<string, string>>(initial);
  const [baseline, setBaseline] = useState<Record<string, string>>(initial);
  const [q, setQ] = useState("");
  const [onlyDeducted, setOnlyDeducted] = useState(false);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const manualAmt = (id: string) => Math.max(0, Math.floor(Number((map[id] ?? "").replace(/[^0-9]/g, "")) || 0));
  const scrapedAmt = (id: string) => Math.max(0, Math.floor(Number(scraped[id] ?? 0)));
  // 적용 차감액 = 수동 조정값이 있으면 그것, 없으면 스크래핑 자동값.
  const amount = (id: string) => {
    const m = manualAmt(id);
    return m > 0 ? m : scrapedAmt(id);
  };

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(map), ...Object.keys(baseline)]);
    for (const k of keys) {
      const a = Math.floor(Number((map[k] ?? "").replace(/[^0-9]/g, "")) || 0);
      const b = Math.floor(Number((baseline[k] ?? "").replace(/[^0-9]/g, "")) || 0);
      if (a !== b) return true;
    }
    return false;
  }, [map, baseline]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return riders.filter((r) => {
      if (onlyDeducted && amount(r.id) <= 0) return false;
      if (!needle) return true;
      return r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riders, q, onlyDeducted, map]);

  const deductedCount = useMemo(() => riders.reduce((n, r) => n + (amount(r.id) > 0 ? 1 : 0), 0), [riders, map]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalDeduction = useMemo(() => riders.reduce((s, r) => s + amount(r.id), 0), [riders, map]); // eslint-disable-line react-hooks/exhaustive-deps

  function setAmount(id: string, raw: string) {
    const v = raw.replace(/[^0-9]/g, "");
    setMap((prev) => ({ ...prev, [id]: v }));
    setSaved(false);
    setError(undefined);
  }

  function submit() {
    startSave(async () => {
      const payload: Record<string, number> = {};
      for (const [k, v] of Object.entries(map)) {
        const n = Math.floor(Number(v.replace(/[^0-9]/g, "")) || 0);
        if (n > 0) payload[k] = n;
      }
      const res = await saveRiderDeductions(payload);
      if (res.ok) {
        setBaseline(map);
        setSaved(true);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-black tracking-[-0.02em] text-jb-ink">차감 정산</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">
          <span className="font-semibold text-jb-ink-soft">시간제보험료</span>는 주간 정산서(을지)에서 <span className="font-semibold text-jb-ink-soft">자동 반영</span>됩니다{latestDate ? ` (최근 반영 주차: ${latestDate})` : " (아직 반영된 보험료 없음)"}. 필요 시 수동 조정 가능 · 금요일 정산 시 별도 차감.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
        <SummaryCard label="차감 대상" value={`${won(deductedCount)}명`} />
        <SummaryCard label="총 차감액" value={`${won(totalDeduction)}원`} sub="시간제보험료" accent />
      </div>

      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jb-line px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-jb-ink">라이더별 시간제보험료</h2>
            <p className="mt-0.5 text-[12.5px] text-jb-ink-mute">라이더에 귀속돼 유지됩니다 · 차감 {deductedCount}명</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-jb-ink-soft">
              <input type="checkbox" checked={onlyDeducted} onChange={(e) => setOnlyDeducted(e.target.checked)} className="accent-jb-indigo" />
              <span className="hidden sm:inline">차감 대상만</span>
              <span className="sm:hidden">대상만</span>
            </label>
            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-surface px-2.5 py-1.5 sm:flex-none">
              <Search size={15} className="shrink-0 text-jb-ink-mute" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·ID 검색" className="w-full min-w-0 bg-transparent text-[13px] text-jb-ink outline-none placeholder:text-jb-ink-mute sm:w-[130px]" />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {saved && !dirty ? (
                <span className="flex items-center gap-1 text-[12px] font-medium text-jb-green"><Check size={14} /> 저장됨</span>
              ) : dirty ? (
                <span className="text-[12px] font-medium text-jb-orange">저장 안 됨</span>
              ) : null}
              <button
                type="button"
                onClick={submit}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 rounded-[10px] bg-jb-indigo px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Save size={15} />
                {saving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="border-b border-jb-line px-4 py-2 text-[12.5px] font-medium text-jb-red">{error}</p> : null}

        <div className="max-h-[calc(100dvh-360px)] overflow-auto">
          <table className="w-full whitespace-nowrap border-collapse text-[13px]">
            <thead className="sticky top-0 z-10 bg-jb-surface text-[12px] font-medium text-jb-ink-mute">
              <tr>
                <th className="border-b border-jb-line px-2 py-2.5 text-right">#</th>
                <th className="min-w-[96px] border-b border-jb-line px-4 py-2.5 text-left">라이더</th>
                <th className="w-full border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
                <th className="w-[160px] border-b border-l border-jb-line px-3 py-2.5 text-right">시간제보험료<span className="font-normal text-jb-ink-mute"> 자동</span></th>
                <th className="w-[150px] border-b border-jb-line px-3 py-2.5 text-right">수동 조정</th>
                <th className="w-[150px] border-b border-l border-jb-line px-3 py-2.5 text-right font-semibold text-jb-ink">적용 차감액</th>
              </tr>
            </thead>
            <tbody>
              {view.map((r, i) => (
                <tr key={r.id} className="border-b border-jb-line-soft">
                  <td className="px-3 py-2 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{i + 1}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-medium text-jb-ink">{r.name}{termSet.has(r.id) ? <TerminatedBadge /> : null}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-jb-ink-mute">{r.id}</td>
                  <td className="border-l border-jb-line-soft px-3 py-2 text-right font-mono tabular-nums text-jb-ink-soft">
                    {scrapedAmt(r.id) > 0 ? won(scrapedAmt(r.id)) : "-"}
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="numeric"
                      value={map[r.id] ?? ""}
                      onChange={(e) => setAmount(r.id, e.target.value)}
                      placeholder="자동값 사용"
                      className="w-full rounded-[8px] border border-transparent bg-transparent px-2.5 py-1.5 text-right font-mono text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute"
                    />
                  </td>
                  <td className="border-l border-jb-line-soft px-3 py-2 text-right font-mono font-bold tabular-nums text-jb-indigo">
                    {amount(r.id) > 0 ? won(amount(r.id)) : "-"}
                  </td>
                </tr>
              ))}
              {view.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[13px] text-jb-ink-mute">해당하는 라이더가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-[12px] border border-jb-line bg-jb-card px-4 py-3.5 shadow-[var(--toss-shadow)]">
      <div className="flex items-center gap-1.5">
        <span className="text-[12.5px] text-jb-ink-mute">{label}</span>
        {sub ? <span className="rounded-[5px] bg-jb-surface px-1 py-0.5 text-[10px] font-medium text-jb-ink-mute">{sub}</span> : null}
      </div>
      <div className={`mt-1 break-keep font-mono text-[17px] font-semibold tabular-nums tracking-[-0.01em] sm:text-[20px] ${accent ? "text-jb-indigo" : "text-jb-ink"}`}>
        {value}
      </div>
    </div>
  );
}
