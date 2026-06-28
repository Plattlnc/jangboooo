// 내 주변 정비소 (시안). 위치 기준 정비소 목록.

import { Phone } from "lucide-react";
import { REPAIR_SHOPS } from "@/lib/mock/repair";

export default function RepairPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">내 주변 정비소</h1>
      <p className="my-1 mb-3.5 text-[12.5px] text-jb-ink-mute">현재 위치 · 서울 강남구 역삼동 기준</p>

      {/* 지도 영역 (목업) */}
      <div className="relative mb-3.5 flex h-[130px] items-center justify-center rounded-[14px] border border-jb-line bg-[repeating-linear-gradient(135deg,#eef1fe,#eef1fe_12px,#e4e9fd_12px,#e4e9fd_24px)]">
        <span className="rounded-md bg-white/80 px-2.5 py-1 font-mono text-[11px] text-jb-indigo">[ 지도 영역 ]</span>
        <span className="absolute left-[46%] top-[42%] size-3.5 rounded-full border-[3px] border-white bg-jb-indigo shadow-[0_2px_6px_rgba(79,106,245,0.4)]" />
      </div>

      <div className="flex flex-col gap-[11px]">
        {REPAIR_SHOPS.map((r) => (
          <div
            key={r.name}
            className="flex items-center gap-[13px] rounded-[14px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
          >
            <div className="size-[50px] shrink-0 rounded-[13px] bg-[repeating-linear-gradient(45deg,#eef0f3,#eef0f3_7px,#e4e7ec_7px,#e4e7ec_14px)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[7px]">
                <span className="text-[14.5px] font-black tracking-[-0.02em]">{r.name}</span>
                <span
                  className="rounded-md px-[7px] py-0.5 text-[10.5px] font-bold"
                  style={{ color: r.openColor, background: r.openBg }}
                >
                  {r.open}
                </span>
              </div>
              <div className="mt-[3px] flex items-center gap-[5px] text-xs text-jb-ink-soft">
                <span className="text-jb-gold">★</span>
                <span className="tnum font-bold text-jb-ink">{r.rating}</span>
                <span className="text-[#c4c8d2]">·</span>
                <span>{r.spec}</span>
              </div>
              <div className="tnum mt-[5px] text-[11.5px] text-jb-ink-mute">
                {r.dist} · {r.time}
              </div>
            </div>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-[10px] border border-jb-line bg-white px-[13px] py-[9px] text-xs font-black text-jb-indigo"
            >
              <Phone size={13} strokeWidth={2.4} />
              전화
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
