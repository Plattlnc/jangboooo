import type { ReactNode } from "react";
import Link from "next/link";
import { ListChecks, FileSpreadsheet, ArrowRight } from "lucide-react";
import { fetchDailySettlement } from "@/app/settlement/_lib/daily";
import { kstToday, kstYesterday, formatKoreanDate } from "@/app/settlement/_lib/dates";

export const dynamic = "force-dynamic";

const won = (n: number) => n.toLocaleString("ko-KR");

// 정산 홈(#3) — 어제 정산 요약 + 주요 업무 진입.
export default async function SettlementHome() {
  const yesterday = kstYesterday();
  const data = await fetchDailySettlement(yesterday);
  const { totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-jb-ink">정산 홈</h1>
        <p className="mt-1 text-[13.5px] text-jb-ink-mute">오늘 {formatKoreanDate(kstToday())} · 슬라이더 정산팀</p>
      </div>

      {/* 어제 정산 요약 */}
      <div className="rounded-[16px] border border-jb-line bg-jb-card p-5 shadow-[var(--toss-shadow)] md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-medium text-jb-ink-mute">어제 정산 요약</div>
            <div className="mt-0.5 text-[15px] font-semibold text-jb-ink">{formatKoreanDate(yesterday)}</div>
          </div>
          <Link
            href="/settlement/daily"
            className="flex items-center gap-1 rounded-[10px] bg-jb-indigo px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            일일 정산 열기
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="지급 대상" value={`${won(totals.riders)}명`} />
          <Stat label="총 완료건수" value={`${won(totals.completed)}건`} />
          <Stat label="총 배달처리비" value={`${won(totals.fee)}원`} />
          <Stat label="총 지급액" value={`${won(totals.total)}원`} accent />
        </div>
        {totals.riders === 0 ? (
          <p className="mt-4 rounded-[10px] bg-jb-surface px-3.5 py-2.5 text-[12.5px] text-jb-ink-mute">
            아직 어제 배달처리비가 반영되지 않았습니다. 익일 오전 8시 이후 자동 수집됩니다.
          </p>
        ) : null}
      </div>

      {/* 주요 업무 */}
      <div className="grid gap-4 md:grid-cols-2">
        <TaskCard
          href="/settlement/daily"
          icon={<ListChecks size={20} />}
          title="일일 정산"
          desc="전일 라이더별 배달처리비(세전)를 목록으로 확인하고, 송금 대상을 정리해 CSV로 내보냅니다."
        />
        <TaskCard
          href="/settlement/weekly"
          icon={<FileSpreadsheet size={20} />}
          title="정산서"
          desc="라이더별 수~화 주간 배달처리비 + 프로모션(기타비용)을 합산해 세무사 제출용 정산서를 만듭니다."
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[12.5px] text-jb-ink-mute">{label}</div>
      <div
        className={`mt-1 break-keep font-mono text-[19px] font-semibold tabular-nums tracking-[-0.01em] sm:text-[22px] ${accent ? "text-jb-indigo" : "text-jb-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function TaskCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-[16px] border border-jb-line bg-jb-card p-5 shadow-[var(--toss-shadow)] transition-colors hover:border-jb-indigo/40"
    >
      <div className="grid size-11 place-items-center rounded-[12px] bg-jb-indigo-tint text-jb-indigo">{icon}</div>
      <div>
        <div className="flex items-center gap-1 text-[16px] font-semibold text-jb-ink">
          {title}
          <ArrowRight size={16} className="text-jb-ink-mute transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-jb-ink-mute">{desc}</p>
      </div>
    </Link>
  );
}
