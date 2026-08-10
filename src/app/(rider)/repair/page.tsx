// 내 주변 정비소 — 관리자(/admin/repair-shops)가 등록한 제휴 정비소 노출.
// 등록분이 없으면 준비중 상태(미정 값을 '-'/가짜 데이터로 채우지 않음).

import { Wrench, Clock, Phone, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RepairShopRow } from "@/types/database";

export const dynamic = "force-dynamic";

async function getActiveShops(): Promise<RepairShopRow[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("repair_shops")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    return data ?? [];
  } catch {
    return []; // env 미설정 등 — 준비중 상태로 폴백
  }
}

export default async function RepairPage() {
  const shops = await getActiveShops();

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">내 주변 정비소</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">
        {shops.length > 0 ? `제휴 정비소 ${shops.length}곳` : "현재 위치 기준 제휴 정비소 찾기"}
      </p>

      {shops.length === 0 ? (
        <>
          {/* 히어로 — 준비 상태 */}
          <div className="rounded-2xl bg-[linear-gradient(135deg,#5b6660,#77837c)] px-[18px] py-[17px] text-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.14)]">
            <div className="text-[12.5px] font-semibold opacity-90">제휴 준비 중</div>
            <div className="mt-[7px] flex items-center gap-2">
              <Clock size={18} strokeWidth={2.2} className="opacity-90" />
              <span className="text-[19px] font-black tracking-[-0.02em]">곧 오픈해요</span>
            </div>
            <div className="mt-[13px] border-t border-white/20 pt-3 text-xs leading-relaxed opacity-90">
              제휴 정비소가 등록되면 현재 위치 기준으로
              <br />
              가까운 정비소를 찾고 바로 연락할 수 있어요.
            </div>
          </div>

          {/* 빈 상태 */}
          <div className="mt-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
            <div className="text-[13px] font-black">주변 정비소</div>
            <div className="flex flex-col items-center gap-2.5 py-9">
              <span className="grid size-11 place-items-center rounded-[12px] bg-[#eef0f3] text-[#5b6660]">
                <Wrench size={20} strokeWidth={1.8} />
              </span>
              <div className="text-center">
                <div className="text-[13.5px] font-bold text-jb-ink">아직 등록된 정비소가 없어요</div>
                <div className="mt-1 text-[12px] leading-relaxed text-jb-ink-mute">
                  제휴 정비소 등록이 완료되면
                  <br />
                  이곳에 목록이 표시됩니다.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-[11px]">
          {shops.map((s) => (
            <div
              key={s.id}
              className="rounded-[12px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-[13px]">
                <span className="grid size-[46px] shrink-0 place-items-center rounded-[12px] bg-[#eef0f3] text-[#5b6660]">
                  <Wrench size={20} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-black tracking-[-0.02em]">{s.name}</div>
                  {s.phone ? (
                    // 번호는 눈에 잘 보이는 크기의 텍스트로도 노출 — select-all 로 탭 한 번에 전체 선택(복사).
                    <div className="mt-[3px] flex items-center gap-1.5">
                      <Phone size={13} strokeWidth={2.2} className="shrink-0 text-jb-indigo" />
                      <span className="tnum select-all text-[16px] font-black tracking-[-0.01em] text-jb-ink">
                        {s.phone}
                      </span>
                    </div>
                  ) : null}
                  {s.address ? (
                    <div className="mt-1 flex items-center gap-1 text-[11.5px] text-jb-ink-soft">
                      <MapPin size={11} strokeWidth={2} className="shrink-0 text-jb-ink-mute" />
                      <span className="truncate">{s.address}</span>
                    </div>
                  ) : null}
                  {s.note ? (
                    <div className="mt-0.5 text-[11.5px] text-jb-ink-mute">{s.note}</div>
                  ) : null}
                </div>
                {s.phone ? (
                  <a
                    href={`tel:${s.phone.replace(/\D/g, "")}`}
                    aria-label={`${s.name} 전화하기`}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-jb-indigo text-white transition-transform active:scale-95"
                  >
                    <Phone size={17} strokeWidth={2.2} />
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
