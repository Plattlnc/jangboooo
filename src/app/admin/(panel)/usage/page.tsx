// 관리자 > 사용 현황 (0017) — 앱 방문(오픈)·활성 라이더 일별 집계.
// 집계 시작: 2026-08-04 (미들웨어 방문 로그 도입) — 그 이전 데이터는 없음.
// "방문" = 문서 요청(앱 오픈) 기준. 60s 폴링·앱 내 이동은 미포함.

import { createAdminClient } from "@/lib/supabase/admin";
import type { AppUsageRow } from "@/types/database";

export const dynamic = "force-dynamic";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function weekdayOf(date: string): string {
  return WEEKDAY[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

async function getUsage(): Promise<AppUsageRow[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("get_app_usage", { p_days: 14 });
    if (error) {
      console.error("[usage] get_app_usage RPC 실패:", error.code, error.message);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("[usage] 예기치 못한 예외:", e);
    return [];
  }
}

export default async function UsagePage() {
  const rows = await getUsage();
  const today = todayKst();
  const todayRow = rows.find((r) => r.day === today) ?? null;

  return (
    <div className="px-3.5 py-[9px]">
      <div className="mb-1.5 px-0.5 pt-1">
        <span className="text-[15px] font-black text-jb-ink">사용 현황</span>
        <div className="mt-0.5 text-[11px] text-jb-ink-mute">
          방문 = 앱을 연 횟수(문서 요청) · 활성 = 하루 1회 이상 접속한 라이더 수 · KST 기준
        </div>
      </div>

      {/* 오늘 히어로 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#4F6AF5,#5d77ff)] px-[17px] py-[15px] text-white shadow-[0_8px_16px_-4px_rgba(0,112,243,0.30)]">
        <div className="text-[12.5px] font-semibold opacity-90">오늘</div>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <div className="text-[11.5px] font-semibold opacity-90">방문</div>
            <div className="tnum mt-0.5 text-[24px] font-black leading-none tracking-[-0.02em]">
              {(todayRow?.visits ?? 0).toLocaleString("ko-KR")}
              <span className="ml-0.5 text-[13px] font-bold opacity-90">회</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11.5px] font-semibold opacity-90">활성 라이더</div>
            <div className="tnum mt-0.5 text-[24px] font-black leading-none tracking-[-0.02em]">
              {(todayRow?.riders ?? 0).toLocaleString("ko-KR")}
              <span className="ml-0.5 text-[13px] font-bold opacity-90">명</span>
            </div>
          </div>
        </div>
      </div>

      {/* 일별 표 */}
      <div className="mt-2">
        <div className="mb-1.5 px-0.5">
          <span className="text-[15px] font-black text-jb-ink">일별 추이</span>
          <span className="ml-1.5 text-[11px] font-bold text-jb-ink-mute">최근 14일</span>
        </div>
        <div className="rounded-[12px] border border-jb-line bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_1px_2px_0_rgba(0,0,0,0.04)]">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] font-bold text-jb-ink-mute">
              아직 집계된 방문이 없어요
              <div className="mt-1 font-semibold">2026-08-04부터 집계를 시작했어요 — 라이더가 앱을 열면 쌓입니다.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-1.5 text-[10.5px] font-bold text-jb-ink-mute">
                <span>날짜</span>
                <span className="w-[64px] text-right">방문</span>
                <span className="w-[72px] text-right">활성 라이더</span>
              </div>
              {rows.map((r) => (
                <div
                  key={r.day}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-jb-line-soft px-3.5 py-2 last:border-b-0"
                >
                  <span className="tnum text-[12.5px] font-bold text-jb-ink">
                    {r.day}
                    <span className="ml-1 text-[11px] font-semibold text-jb-ink-mute">({weekdayOf(r.day)})</span>
                  </span>
                  <span className="tnum w-[64px] text-right text-[12.5px] font-black text-jb-ink">
                    {r.visits.toLocaleString("ko-KR")}
                  </span>
                  <span className="tnum w-[72px] text-right text-[12.5px] font-black text-jb-indigo">
                    {r.riders.toLocaleString("ko-KR")}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="mt-1 pb-0.5 text-center text-[11px] text-jb-ink-mute">
        앱 내 화면 이동·자동 새로고침은 방문 수에 포함되지 않습니다.
      </div>
    </div>
  );
}
