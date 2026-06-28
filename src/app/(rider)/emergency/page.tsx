// 긴급출동서비스 (시안). 사고·고장 시 출동대 연결.

import { Siren, Truck, BatteryCharging, Disc3, KeyRound, type LucideIcon } from "lucide-react";
import { EMERGENCY_SERVICES, EMERGENCY_AGENTS, type EmergencyIcon } from "@/lib/mock/emergency";

const SERVICE_ICON: Record<EmergencyIcon, LucideIcon> = {
  tow: Truck,
  battery: BatteryCharging,
  tire: Disc3,
  lock: KeyRound,
};

export default function EmergencyPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black tracking-[-0.03em]">긴급출동서비스</h1>
        <span className="rounded-full bg-jb-red-tint px-2.5 py-[3px] text-[11px] font-bold text-jb-red">24시간</span>
      </div>
      <p className="my-[5px] mb-3.5 text-[12.5px] text-jb-ink-mute">사고·고장 시 가까운 출동대를 즉시 연결해요</p>

      {/* SOS 히어로 */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#FF6B35,#FF3B5C)] px-[18px] py-[17px] text-white shadow-[0_10px_24px_rgba(217,52,43,0.28)]">
        <div className="flex items-center gap-[11px]">
          <span className="grid size-[42px] shrink-0 place-items-center rounded-[13px] bg-white/20">
            <Siren size={22} strokeWidth={2} className="animate-pulse-dot" />
          </span>
          <div>
            <div className="text-base font-black tracking-[-0.02em]">지금 출동이 필요하세요?</div>
            <div className="mt-0.5 text-[11.5px] opacity-90">현재 위치 · 강남구 역삼동 · GPS 연결됨</div>
          </div>
        </div>
        <button
          type="button"
          className="mt-3.5 w-full rounded-[13px] bg-white py-3.5 text-[15px] font-black text-jb-red transition-transform active:scale-[.98]"
        >
          긴급출동 요청하기
        </button>
      </div>

      {/* 서비스 유형 */}
      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        {EMERGENCY_SERVICES.map((e) => {
          const Icon = SERVICE_ICON[e.icon];
          return (
            <div
              key={e.label}
              className="rounded-[14px] border border-jb-line bg-white p-3.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
            >
              <span className="grid size-9 place-items-center rounded-[10px] bg-jb-red-tint text-jb-red">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <div className="mt-[9px] text-sm font-black tracking-[-0.02em]">{e.label}</div>
              <div className="mt-0.5 text-[11.5px] text-jb-ink-mute">{e.desc}</div>
            </div>
          );
        })}
      </div>

      {/* 출동 가능 업체 */}
      <div className="my-2.5 mt-4 text-[13px] font-black">
        출동 가능한 업체 <span className="tnum text-jb-red">{EMERGENCY_AGENTS.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {EMERGENCY_AGENTS.map((a) => (
          <div
            key={a.name}
            className="flex items-center gap-3 rounded-[14px] border border-jb-line bg-white px-3.5 py-[13px] shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
          >
            <div className="size-11 shrink-0 rounded-xl bg-[repeating-linear-gradient(45deg,#fbe9e8,#fbe9e8_7px,#f7dcda_7px,#f7dcda_14px)]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-[7px]">
                <span className="text-sm font-black tracking-[-0.02em]">{a.name}</span>
                <span
                  className="rounded-md px-[7px] py-0.5 text-[10.5px] font-bold"
                  style={
                    a.open
                      ? { color: "#1E9E5A", background: "#e7f5ee" }
                      : { color: "#E8590C", background: "#fdf0e6" }
                  }
                >
                  {a.open ? "출동가능" : "대기중"}
                </span>
              </div>
              <div className="tnum mt-1 text-xs text-jb-ink-soft">
                ★ {a.rating} · {a.dist} · 예상 {a.eta}
              </div>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[10px] bg-jb-red px-3.5 py-[9px] text-xs font-black text-white"
            >
              호출
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
