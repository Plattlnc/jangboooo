// 관리자 홈 뷰모델 — 서버에서 표시용 문자열까지 프리컴퓨트해 클라이언트 페이로드를 슬림화.
// (기존엔 3기간 × 전 라이더 원본 배열을 통째로 직렬화 → 수백 KB. VM 은 표시 항목만.)
import type { AdminPeriodView } from "@/lib/supabase/admin-queries";
import { acceptBand, fmtCapturedAt, fmtCount, fmtPct } from "./format";

export interface AdminHomeVM {
  rangeLabel: string;
  hero: {
    completed: string;
    accept: string;
    bandLabel: string;
    bandColor: string;
    /** "일반 n · B마트 n · 스토어 n" — breakdown 없으면 null. */
    split: string | null;
    active: string;
    registered: string;
    captured: string;
  };
  hasBreakdown: boolean;
  status: { label: string; value: string; bmart: string | null; store: string | null; color: string; tileBg: string }[];
  peaks: { label: string; value: string; isMax: boolean }[];
  atRisk: { id: string; name: string; rate: string; bandLabel: string; bandColor: string }[];
  top: { id: string; name: string; completed: string; bmart: string | null; store: string | null; rate: string }[];
  daily: { date: string; completed: string; rejected: string; rate: string; rateColor: string }[];
}

const STATUS_META = [
  { key: "completed", catKey: "complete", label: "완료", color: "#1E9E5A", tint: "#e7f5ee" },
  { key: "rejected", catKey: "reject", label: "거절", color: "#D9342B", tint: "#fbe9e8" },
  { key: "dispatchCanceled", catKey: "cancel", label: "배차취소", color: "#E8590C", tint: "#fdf0e6" },
  { key: "deliveryCanceled", catKey: "riderFault", label: "배달취소", color: "#9b9588", tint: "#f4f5f7" },
] as const;

const PEAK_META = [
  { key: "morning", label: "아침점심" },
  { key: "afternoon", label: "오후" },
  { key: "evening", label: "저녁" },
  { key: "midnight", label: "심야" },
] as const;

export function toAdminHomeVM(
  view: AdminPeriodView,
  riderInfo: Record<string, { name: string | null; isActive: boolean }>,
  registered: number,
  rangeLabel: string,
): AdminHomeVM {
  const t = view.totals;
  const catSum =
    t.food.complete + t.food.reject + t.food.cancel + t.food.riderFault +
    t.bmart.complete + t.bmart.reject + t.bmart.cancel + t.bmart.riderFault +
    t.store.complete + t.store.reject + t.store.cancel + t.store.riderFault;
  const hasBreakdown = catSum > 0 || t.completed === 0;
  const band = acceptBand(t.acceptanceRate);
  const nameOf = (id: string) => riderInfo[id]?.name ?? id;

  const status = STATUS_META.map((meta) => {
    const total = t[meta.key];
    const bmart = t.bmart[meta.catKey];
    const store = t.store[meta.catKey];
    return {
      label: meta.label,
      value: fmtCount(hasBreakdown ? Math.max(0, total - bmart - store) : total),
      bmart: hasBreakdown ? fmtCount(bmart) : null,
      store: hasBreakdown ? fmtCount(store) : null,
      color: total > 0 ? meta.color : "#b9bdc7",
      tileBg: total > 0 ? meta.tint : "#f5f6f8",
    };
  });

  const peakMax = Math.max(...PEAK_META.map((p) => t.peaks[p.key]));
  const peaks = PEAK_META.map((p) => ({
    label: p.label,
    value: fmtCount(t.peaks[p.key]),
    isMax: t.peaks[p.key] === peakMax && peakMax > 0,
  }));

  const atRisk = view.riders
    .filter((r) => r.acceptanceRate != null && r.assigned > 0)
    .sort((a, b) => (a.acceptanceRate ?? 0) - (b.acceptanceRate ?? 0))
    .slice(0, 5)
    .map((r) => {
      const rb = acceptBand(r.acceptanceRate);
      return {
        id: r.adminRiderId,
        name: nameOf(r.adminRiderId),
        rate: fmtPct(r.acceptanceRate),
        bandLabel: rb.label,
        bandColor: rb.color,
      };
    });

  const top = view.riders.slice(0, 5).map((r) => ({
    id: r.adminRiderId,
    name: nameOf(r.adminRiderId),
    completed: fmtCount(r.completed),
    bmart: hasBreakdown && r.bmart.complete > 0 ? fmtCount(r.bmart.complete) : null,
    store: hasBreakdown && r.store.complete > 0 ? fmtCount(r.store.complete) : null,
    rate: fmtPct(r.acceptanceRate),
  }));

  const daily = [...view.daily].reverse().slice(0, 7).map((d) => ({
    date: d.date.slice(5).replace("-", "."),
    completed: fmtCount(d.completed),
    rejected: fmtCount(d.rejected),
    rate: fmtPct(d.acceptanceRate),
    rateColor: acceptBand(d.acceptanceRate).color,
  }));

  return {
    rangeLabel,
    hero: {
      completed: fmtCount(t.completed),
      accept: fmtPct(t.acceptanceRate),
      bandLabel: band.label,
      bandColor: band.color,
      split: hasBreakdown
        ? `일반 ${fmtCount(Math.max(0, t.completed - t.bmart.complete - t.store.complete))} · B마트 ${fmtCount(t.bmart.complete)} · 스토어 ${fmtCount(t.store.complete)}`
        : null,
      active: fmtCount(t.activeRiders),
      registered: fmtCount(registered),
      captured: fmtCapturedAt(t.lastCapturedAt),
    },
    hasBreakdown,
    status,
    peaks,
    atRisk,
    top,
    daily,
  };
}
