import Link from "next/link";
import { TrendingUp, Package, Building2, Megaphone, Truck, Users, ArrowRight, Target } from "lucide-react";
import type { DashboardData } from "@/app/settlement/_lib/dashboard";
import { SettlementHeader } from "./settlement-header";

// 정산 홈(대시보드) — 회사 현황 한눈에. 서버 컴포넌트(정적 렌더, 인터랙션 없음).
const won = (n: number) => n.toLocaleString("ko-KR");
const eok = (n: number) => (n >= 100000000 ? `${(n / 100000000).toFixed(2)}억` : n >= 10000 ? `${Math.round(n / 10000).toLocaleString("ko-KR")}만` : `${won(n)}`);

export function DashboardView({ data }: { data: DashboardData }) {
  const { week, revenue, prevRevenue, revenueTrend, daily } = data;
  const revDelta = revenue && prevRevenue ? revenue.mgmtFeeTotal - prevRevenue.mgmtFeeTotal : null;
  const maxDaily = Math.max(1, ...daily.map((d) => d.completed));
  const maxTrend = Math.max(1, ...revenueTrend.map((w) => w.mgmtFeeTotal));
  const slotPct = revenue && revenue.totalSlots ? Math.round((revenue.achievedSlots ?? 0) / revenue.totalSlots * 100) : null;

  return (
    <div>
      <SettlementHeader
        title="홈"
        badge="대시보드"
        subtitle={`${week ? `최신 확정 주차 ${week.start} ~ ${week.end} 기준` : "회사 현황 요약"} · 슬라이더 정산팀`}
        actions={
          <Link href="/settlement/revenue" className="flex items-center gap-1 rounded-[10px] border border-jb-line px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface">
            매출 상세 <ArrowRight size={14} />
          </Link>
        }
      />
      <div className="flex flex-col gap-5">

      {/* 상단: 매출 히어로 + 세트 달성 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 매출(관리비) */}
        <div className="rounded-[16px] border border-jb-line bg-jb-card p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-jb-ink-soft"><TrendingUp size={15} className="text-jb-indigo" /> 매출 (관리비 · 회사 메인 수입)</span>
            {revDelta != null ? (
              <span className={`text-[12.5px] font-semibold tabular-nums ${revDelta >= 0 ? "text-jb-green" : "text-jb-red"}`}>
                전주 대비 {revDelta >= 0 ? "+" : "−"}{won(Math.abs(revDelta))}원
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-[36px] font-black leading-none tabular-nums tracking-[-0.02em] text-jb-ink">{revenue ? won(revenue.mgmtFeeTotal) : "—"}</span>
            <span className="pb-1 text-[15px] font-bold text-jb-ink-soft">원</span>
            {revenue ? <span className="pb-1.5 text-[12px] text-jb-ink-mute">VAT 포함 {won(Math.round(revenue.mgmtFeeTotal * 1.1))}원</span> : null}
          </div>
          {revenue ? (
            <>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-jb-surface">
                <div className="bg-jb-indigo" style={{ width: `${(revenue.baseFee / Math.max(1, revenue.mgmtFeeTotal)) * 100}%` }} />
                <div className="bg-jb-green" style={{ width: `${(revenue.bonusFee / Math.max(1, revenue.mgmtFeeTotal)) * 100}%` }} />
              </div>
              <div className="mt-2 flex gap-4 text-[12px]">
                <span className="text-jb-ink-mute"><span className="mr-1 inline-block size-2 rounded-full bg-jb-indigo align-middle" />기본 {won(revenue.baseFee)}원</span>
                <span className="text-jb-ink-mute"><span className="mr-1 inline-block size-2 rounded-full bg-jb-green align-middle" />보너스 {won(revenue.bonusFee)}원</span>
              </div>
            </>
          ) : <p className="mt-3 text-[13px] text-jb-ink-mute">주간 정산서가 아직 반영되지 않았습니다.</p>}
        </div>

        {/* 세트 달성률 */}
        <div className="rounded-[16px] border border-jb-line bg-jb-card p-5">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-jb-ink-soft"><Target size={15} className="text-jb-indigo" /> 주간 세트 달성</span>
          {revenue ? (
            <>
              <div className="mt-2 flex items-end gap-1.5">
                <span className="text-[30px] font-black leading-none tabular-nums text-jb-ink">{slotPct ?? "—"}</span>
                <span className="pb-1 text-[14px] font-bold text-jb-ink-soft">%</span>
                <span className="pb-1 text-[12px] text-jb-ink-mute">슬롯 {revenue.achievedSlots}/{revenue.totalSlots}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-jb-surface">
                <div className="h-full rounded-full bg-jb-indigo" style={{ width: `${slotPct ?? 0}%` }} />
              </div>
              <div className="mt-3 space-y-1 text-[12px] text-jb-ink-mute">
                <div className="flex justify-between"><span>유효 처리 / 발주</span><span className="font-semibold tabular-nums text-jb-ink-soft">{won(revenue.effectiveVolume ?? 0)} / {won(revenue.totalOrderVolume ?? 0)}</span></div>
                <div className="flex justify-between"><span>하위 3슬롯 달성률</span><span className="font-semibold tabular-nums text-jb-ink-soft">{revenue.low3Achievement ?? "—"}%</span></div>
                <div className="flex justify-between"><span>수락률</span><span className="font-semibold tabular-nums text-jb-ink-soft">{revenue.acceptanceRate ?? "—"}%</span></div>
              </div>
            </>
          ) : <p className="mt-3 text-[13px] text-jb-ink-mute">—</p>}
        </div>
      </div>

      {/* 중단: 주간 정산 지표 4종 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard icon={<Truck size={15} />} label="배달처리비 (주간)" value={`${eok(data.feeTotal)}원`} sub={`완료 ${won(data.completedTotalWeek)}건 · ${won(data.activeRidersWeek)}명`} href="/settlement/daily" />
        <MetricCard icon={<Building2 size={15} />} label="본사 미션 (주간)" value={`${eok(data.missionTotal)}원`} href="/settlement/mission" />
        <MetricCard icon={<Megaphone size={15} />} label="자사 프로모션 (주간)" value={`${eok(data.promoGross)}원`} sub={`대상 ${won(data.promoRiders)}명 (세전)`} href="/settlement/promo" />
        <MetricCard icon={<Users size={15} />} label="라이더 현황" value={`${won(data.ridersActive)}명`} sub={`계약중 · 종료 ${won(data.ridersTerminated)} · 오늘 활동 ${won(data.ridersToday)}`} href="/settlement/rider-admin" />
      </div>

      {/* 하단: 일별 완료건 추이 + 매출 추이 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-jb-line bg-jb-card p-5">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-jb-ink-soft"><Package size={15} /> 일별 총 완료건수 (최근 14일)</div>
          <div className="mt-4 flex h-[120px] items-end gap-1">
            {[...daily].reverse().map((d) => (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.date} · ${won(d.completed)}건 · ${d.riders}명`}>
                <span className="text-[9px] tabular-nums text-jb-ink-mute opacity-0 group-hover:opacity-100">{won(d.completed)}</span>
                <div className="w-full rounded-t-[3px] bg-jb-indigo/80 transition-colors group-hover:bg-jb-indigo" style={{ height: `${Math.max(4, (d.completed / maxDaily) * 100)}%` }} />
                <span className="text-[9px] tabular-nums text-jb-ink-mute">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[16px] border border-jb-line bg-jb-card p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-jb-ink-soft"><TrendingUp size={15} /> 주차별 매출 추이</span>
            <Link href="/settlement/revenue" className="text-[12px] font-semibold text-jb-indigo">상세 →</Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {revenueTrend.map((w) => (
              <div key={w.weekStart} className="flex items-center gap-2">
                <span className="w-[92px] shrink-0 text-[11.5px] tabular-nums text-jb-ink-soft">{w.weekStart.slice(5)}~{w.weekEnd.slice(5)}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-jb-surface">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-jb-indigo" style={{ width: `${(w.mgmtFeeTotal / maxTrend) * 100}%` }} />
                </span>
                <span className="w-[82px] shrink-0 text-right text-[12px] font-bold tabular-nums text-jb-ink">{won(w.mgmtFeeTotal)}</span>
              </div>
            ))}
            {revenueTrend.length === 0 ? <p className="text-[13px] text-jb-ink-mute">—</p> : null}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub, href }: { icon: React.ReactNode; label: string; value: string; sub?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-[16px] border border-jb-line bg-jb-card p-4 transition-colors hover:border-jb-indigo/40">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-jb-ink-mute">
        <span className="text-jb-ink-mute">{icon}</span>{label}
        <ArrowRight size={13} className="ml-auto text-jb-ink-mute opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-1.5 text-[22px] font-black tabular-nums tracking-[-0.01em] text-jb-ink">{value}</div>
      {sub ? <div className="mt-0.5 text-[11.5px] text-jb-ink-mute">{sub}</div> : null}
    </Link>
  );
}
