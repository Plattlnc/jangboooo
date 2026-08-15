"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Save, Check, ArrowLeft } from "lucide-react";
import { savePromoRules } from "@/actions/promo-rules";
import type { PromoRules, PromoBasis } from "@/app/settlement/_lib/promo-rules";
import { ymAdd, mdShort } from "@/app/settlement/_lib/dates";

// 자사 프로모션 설정 — 주(수~화)마다 초과 기준 건수·건당 단가를 입력. 정산서·프로모션 정산에 자동 적용.
export function PromoSettings({
  ym,
  thisMonth,
  weeks,
  rules: initial,
}: {
  ym: string;
  thisMonth: string;
  weeks: { start: string; end: string }[];
  rules: PromoRules;
}) {
  const router = useRouter();
  const [rules, setRules] = useState<PromoRules>(initial);
  const [baseline, setBaseline] = useState<PromoRules>(initial);
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const dirty = useMemo(() => JSON.stringify(rules) !== JSON.stringify(baseline), [rules, baseline]);

  const go = (m: string) => router.push(`/settlement/promo/settings?month=${m}`);
  const canNext = ym < thisMonth;

  function setNum(weekStart: string, field: "threshold" | "unit", raw: string) {
    const n = Math.max(0, Math.floor(Number(raw.replace(/[^0-9]/g, "")) || 0));
    setRules((prev) => {
      const cur = prev[weekStart] ?? { threshold: 0, unit: 0, basis: "operating" as PromoBasis };
      const next = { ...cur, [field]: n };
      const copy = { ...prev };
      if (next.threshold === 0 && next.unit === 0) delete copy[weekStart];
      else copy[weekStart] = next;
      return copy;
    });
    setSaved(false);
    setError(undefined);
  }
  function setBasis(weekStart: string, basis: PromoBasis) {
    setRules((prev) => {
      const cur = prev[weekStart];
      if (!cur) return prev; // 초과기준·단가 먼저 입력해야 규칙 생성
      return { ...prev, [weekStart]: { ...cur, basis } };
    });
    setSaved(false);
    setError(undefined);
  }

  function submit() {
    startSave(async () => {
      const res = await savePromoRules(rules);
      if (res.ok) {
        setBaseline(rules);
        setSaved(true);
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/settlement/promo" className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-jb-ink-mute hover:text-jb-ink-soft">
            <ArrowLeft size={13} /> 자사 프로모션
          </Link>
          <h1 className="text-[22px] font-black tracking-[-0.02em] text-jb-ink">자사 프로모션 설정</h1>
          <p className="mt-1 text-[13px] text-jb-ink-mute">
            주(수~화)마다 <span className="font-semibold text-jb-ink-soft">초과 기준 건수</span>·<span className="font-semibold text-jb-ink-soft">건당 단가</span>를 정하면 정산서·프로모션에 자동 적용됩니다. (09~00시 완료건 기준)
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* 월 선택 */}
      <div className="flex items-center rounded-[10px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)] self-start">
        <button type="button" onClick={() => go(ymAdd(ym, -1))} aria-label="이전 달" className="grid size-9 place-items-center rounded-l-[10px] text-jb-ink-soft hover:bg-jb-surface">
          <ChevronLeft size={18} />
        </button>
        <span className="tnum border-x border-jb-line px-4 py-2 text-[14px] font-semibold text-jb-ink">{ym}</span>
        <button type="button" onClick={() => canNext && go(ymAdd(ym, 1))} disabled={!canNext} aria-label="다음 달" className="grid size-9 place-items-center rounded-r-[10px] text-jb-ink-soft hover:bg-jb-surface disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {error ? <p className="text-[12.5px] font-medium text-jb-red">{error}</p> : null}

      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-jb-surface text-[12px] font-medium text-jb-ink-mute">
            <tr>
              <th className="border-b border-jb-line px-4 py-2.5 text-left">주차 (수~화)</th>
              <th className="border-b border-jb-line px-4 py-2.5 text-right">초과 기준(건)</th>
              <th className="border-b border-jb-line px-4 py-2.5 text-right">건당 단가(원)</th>
              <th className="border-b border-jb-line px-4 py-2.5 text-left">집계 기준</th>
              <th className="border-b border-jb-line px-4 py-2.5 text-left">규칙 요약</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w, i) => {
              const r = rules[w.start];
              return (
                <tr key={w.start} className="border-b border-jb-line-soft">
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-jb-ink">
                    {i + 1}주차 <span className="ml-1 font-mono text-[11.5px] text-jb-ink-mute">{mdShort(w.start)}~{mdShort(w.end)}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="numeric"
                      value={r?.threshold ?? ""}
                      onChange={(e) => setNum(w.start, "threshold", e.target.value)}
                      placeholder="0"
                      className="w-full rounded-[8px] border border-jb-line bg-jb-surface px-2.5 py-1.5 text-right font-mono text-[13px] text-jb-ink outline-none focus:border-jb-indigo/50"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      inputMode="numeric"
                      value={r?.unit ?? ""}
                      onChange={(e) => setNum(w.start, "unit", e.target.value)}
                      placeholder="0"
                      className="w-full rounded-[8px] border border-jb-line bg-jb-surface px-2.5 py-1.5 text-right font-mono text-[13px] text-jb-ink outline-none focus:border-jb-indigo/50"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <select
                      value={r?.basis ?? "operating"}
                      onChange={(e) => setBasis(w.start, e.target.value as PromoBasis)}
                      disabled={!r}
                      className="w-full rounded-[8px] border border-jb-line bg-jb-surface px-2 py-1.5 text-[12.5px] text-jb-ink outline-none focus:border-jb-indigo/50 disabled:opacity-50"
                    >
                      <option value="operating">운영시간 09~00시</option>
                      <option value="daily">일일 전체</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-[12.5px] text-jb-ink-soft">
                    {r && (r.threshold > 0 || r.unit > 0)
                      ? `${r.basis === "daily" ? "일일 전체" : "09~00시"} · ${r.threshold.toLocaleString("ko-KR")}건 초과분 건당 ${r.unit.toLocaleString("ko-KR")}원`
                      : "— (프로모션 없음)"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
