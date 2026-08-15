"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Download, X, Loader2, ChevronRight, Phone, MapPin, Bike, Shield, Calendar, TrendingUp } from "lucide-react";
import type { RiderListItem, RiderDetail } from "@/app/settlement/_lib/riders-admin";
import { loadRiderDetail } from "@/actions/rider-directory";
import { TerminatedBadge } from "./terminated-badge";
import { cn } from "@/lib/cn";

// 라이더 관리 — 전 라이더 목록(계약상태·활동요약) + 행 클릭 시 상세 드로어.
type Filter = "all" | "active" | "terminated";
type SortKey = "name" | "lastActive" | "totalCompleted" | "createdAt";

const won = (n: number) => n.toLocaleString("ko-KR");
const dash = (v: string | null | undefined) => (v && v.length ? v : "—");

export function RiderDirectoryView({ riders }: { riders: RiderListItem[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<RiderDetail | null>(null);
  const [pending, startLoad] = useTransition();

  const counts = useMemo(() => ({
    all: riders.length,
    active: riders.filter((r) => r.contractStatus === "계약중").length,
    terminated: riders.filter((r) => r.isTerminated).length,
  }), [riders]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = riders;
    if (filter === "active") list = list.filter((r) => r.contractStatus === "계약중");
    else if (filter === "terminated") list = list.filter((r) => r.isTerminated);
    if (needle) list = list.filter((r) => r.name.toLowerCase().includes(needle) || r.riderId.toLowerCase().includes(needle) || (r.phone ?? "").includes(needle));
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name, "ko");
      if (sortKey === "createdAt") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      if (sortKey === "totalCompleted") return b.totalCompleted - a.totalCompleted;
      return (b.lastActive ?? "").localeCompare(a.lastActive ?? ""); // lastActive desc, null last
    });
    return sorted;
  }, [riders, q, filter, sortKey]);

  function openDetail(riderId: string) {
    setSelected(riderId);
    setDetail(null);
    startLoad(async () => {
      const res = await loadRiderDetail(riderId);
      if (res.ok) setDetail(res.detail);
    });
  }

  function exportCsv() {
    const head = ["순번", "라이더명", "라이더ID", "휴대폰", "계약상태", "지역", "가입일", "마지막 활동일", "활동일수", "누적 완료건"];
    const body = view.map((r, i) => [
      i + 1, r.name, r.riderId, r.phone ?? "", r.contractStatus ?? "", r.region ?? "",
      (r.createdAt ?? "").slice(0, 10), r.lastActive ?? "", r.activeDays, r.totalCompleted,
    ]);
    const csv = [head, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "라이더_관리.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-black tracking-[-0.02em] text-jb-ink">라이더 정보</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">전 라이더 명단·계약상태·활동 현황. 행을 클릭하면 상세 정보를 볼 수 있습니다.</p>
      </div>

      {/* 필터 + 검색 + 정렬 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-[10px] border border-jb-line bg-jb-card p-0.5">
          {([["all", `전체 ${counts.all}`], ["active", `계약중 ${counts.active}`], ["terminated", `계약종료 ${counts.terminated}`]] as [Filter, string][]).map(([f, label]) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn("rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors", filter === f ? "bg-jb-indigo text-white" : "text-jb-ink-soft hover:bg-jb-surface")}>
              {label}
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-[280px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-jb-ink-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·ID·휴대폰 검색"
            className="w-full rounded-[10px] border border-jb-line bg-jb-card py-2 pl-9 pr-3 text-[13.5px] text-jb-ink outline-none transition-colors placeholder:text-jb-ink-mute focus:border-jb-indigo" />
        </label>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-[10px] border border-jb-line bg-jb-card px-3 py-2 text-[13px] text-jb-ink-soft outline-none focus:border-jb-indigo">
          <option value="name">이름순</option>
          <option value="lastActive">최근 활동순</option>
          <option value="totalCompleted">누적 완료순</option>
          <option value="createdAt">가입 최신순</option>
        </select>
        <button type="button" onClick={exportCsv}
          className="ml-auto flex items-center gap-1.5 rounded-[10px] border border-jb-line px-3 py-2 text-[13px] font-semibold text-jb-ink-soft transition-colors hover:bg-jb-surface">
          <Download size={15} /> CSV
        </button>
      </div>

      {/* 목록 */}
      <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card">
        <table className="w-full table-fixed text-[13.5px]">
          <colgroup>
            <col className="w-[6%]" />
            <col className="w-[16%]" />
            <col className="w-[15%]" />
            <col className="w-[13%]" />
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-jb-line bg-jb-surface text-left text-[12px] text-jb-ink-mute">
              <th className="px-4 py-2.5 text-right font-medium">순번</th>
              <th className="px-4 py-2.5 font-medium">라이더명</th>
              <th className="px-4 py-2.5 font-medium">라이더ID</th>
              <th className="px-4 py-2.5 font-medium">휴대폰</th>
              <th className="px-4 py-2.5 font-medium">계약상태</th>
              <th className="px-4 py-2.5 font-medium">지역</th>
              <th className="px-4 py-2.5 text-right font-medium">마지막 활동</th>
              <th className="px-4 py-2.5 text-right font-medium">누적 완료</th>
              <th className="py-2.5" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={r.riderId} onClick={() => openDetail(r.riderId)}
                className={cn("cursor-pointer border-b border-jb-line/60 transition-colors hover:bg-jb-surface/70", selected === r.riderId && "bg-jb-indigo-tint/40")}>
                <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink-mute">{i + 1}</td>
                <td className="truncate px-4 py-2.5 font-semibold text-jb-ink">{r.name}{r.isTerminated ? <TerminatedBadge /> : null}</td>
                <td className="truncate px-4 py-2.5 text-jb-ink-mute">{r.riderId}</td>
                <td className="px-4 py-2.5 tabular-nums text-jb-ink-soft">{dash(r.phone)}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("rounded-[5px] px-1.5 py-0.5 text-[11px] font-semibold", r.isTerminated ? "bg-jb-red-tint text-jb-red" : r.contractStatus === "계약중" ? "bg-jb-green-tint text-jb-green" : "bg-jb-surface text-jb-ink-mute")}>
                    {r.contractStatus ?? "미수집"}
                  </span>
                </td>
                <td className="truncate px-4 py-2.5 text-jb-ink-soft">{dash(r.region)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-jb-ink-soft">{dash(r.lastActive)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-jb-ink">{won(r.totalCompleted)}</td>
                <td className="pr-4 text-right text-jb-ink-mute">
                  <ChevronRight size={16} className="inline-block" />
                </td>
              </tr>
            ))}
            {view.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-16 text-center text-[13px] text-jb-ink-mute">해당하는 라이더가 없습니다.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* 상세 드로어 */}
      {selected ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setSelected(null)} className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 right-0 flex w-[440px] max-w-[92%] flex-col overflow-y-auto border-l border-jb-line bg-jb-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-jb-line bg-jb-card px-5 py-4">
              <span className="text-[15px] font-bold text-jb-ink">라이더 상세</span>
              <button type="button" onClick={() => setSelected(null)} aria-label="닫기" className="grid size-8 place-items-center rounded-[8px] text-jb-ink-mute transition-colors hover:bg-jb-surface"><X size={17} /></button>
            </div>
            {pending || !detail ? (
              <div className="grid flex-1 place-items-center py-24 text-jb-ink-mute"><Loader2 size={22} className="animate-spin" /></div>
            ) : (
              <RiderDetailBody d={detail} />
            )}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function RiderDetailBody({ d }: { d: RiderDetail }) {
  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[20px] font-black text-jb-ink">{d.name}</span>
          {d.isTerminated ? <TerminatedBadge /> : (
            <span className="rounded-[5px] bg-jb-green-tint px-1.5 py-0.5 text-[11px] font-semibold text-jb-green">{d.contractStatus ?? "계약중"}</span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[12.5px] text-jb-ink-mute">{d.riderId}</div>
      </div>

      <Section title="기본 정보">
        <Field icon={<Phone size={13} />} label="휴대폰" value={dash(d.phone)} />
        <Field icon={<MapPin size={13} />} label="지역 · 센터" value={`${dash(d.region)}${d.centerId ? ` · ${d.centerId}` : ""}`} />
        <Field icon={<Calendar size={13} />} label="가입일" value={d.createdAt ? d.createdAt.slice(0, 10) : "—"} />
        <Field label="계약상태 갱신" value={d.contractCapturedAt ? d.contractCapturedAt.slice(0, 10) : "—"} />
      </Section>

      <Section title="등록 정보 (내정보)">
        <Field label="실명 · 실연락처" value={`${dash(d.realName)} · ${dash(d.realPhone)}`} />
        <Field icon={<Bike size={13} />} label="차량번호 · 기종" value={`${dash(d.plate)} · ${dash(d.bikeModel)}`} />
        <Field label="이용 형태" value={dash(d.usageType)} />
        <Field icon={<Shield size={13} />} label="보험" value={d.insuranceStart ? `${d.insuranceStart} 시작 · ${d.insuranceDays ?? "?"}일` : "미등록"} />
      </Section>

      <Section title="배민 활동">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="누적 완료" value={won(d.totalCompleted)} />
          <Stat label="활동 일수" value={`${d.activeDays}일`} />
          <Stat label="마지막 활동" value={d.lastActive ?? "—"} small />
        </div>
        {d.recentCompleted.length ? (
          <div className="mt-2 rounded-[10px] border border-jb-line/70">
            <div className="border-b border-jb-line/70 px-3 py-1.5 text-[11.5px] font-semibold text-jb-ink-mute">최근 배달 (일별)</div>
            {d.recentCompleted.slice(0, 7).map((r) => (
              <div key={r.date} className="flex items-center justify-between border-b border-jb-line/40 px-3 py-1.5 text-[12.5px] last:border-b-0">
                <span className="tabular-nums text-jb-ink-soft">{r.date}</span>
                <span className="tabular-nums text-jb-ink">완료 {r.completed}{r.acceptanceRate != null ? ` · 수락 ${r.acceptanceRate}%` : ""}</span>
              </div>
            ))}
          </div>
        ) : null}
      </Section>

      <Section title="정산 (최근)">
        <Field icon={<TrendingUp size={13} />} label="시간제보험료 (최근 주)" value={d.latestInsuranceKrw != null ? `${won(d.latestInsuranceKrw)}원 · ${d.latestInsuranceWeek}` : "—"} />
        {d.recentFees.length ? (
          <div className="mt-1 rounded-[10px] border border-jb-line/70">
            <div className="border-b border-jb-line/70 px-3 py-1.5 text-[11.5px] font-semibold text-jb-ink-mute">최근 배달처리비 (일별)</div>
            {d.recentFees.slice(0, 7).map((r) => (
              <div key={r.date} className="flex items-center justify-between border-b border-jb-line/40 px-3 py-1.5 text-[12.5px] last:border-b-0">
                <span className="tabular-nums text-jb-ink-soft">{r.date}</span>
                <span className="tabular-nums text-jb-ink">{won(r.feeKrw)}원{r.missionKrw > 0 ? ` · 미션 ${won(r.missionKrw)}` : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12.5px] text-jb-ink-mute">최근 배달처리비 기록 없음</div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-bold text-jb-ink">{title}</div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}
function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px]">
      <span className="flex items-center gap-1.5 text-jb-ink-mute">{icon}{label}</span>
      <span className="text-right font-medium text-jb-ink">{value}</span>
    </div>
  );
}
function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-[10px] border border-jb-line/70 bg-jb-surface/50 px-2.5 py-2 text-center">
      <div className="text-[11px] text-jb-ink-mute">{label}</div>
      <div className={cn("mt-0.5 font-bold tabular-nums text-jb-ink", small ? "text-[12px]" : "text-[15px]")}>{value}</div>
    </div>
  );
}
