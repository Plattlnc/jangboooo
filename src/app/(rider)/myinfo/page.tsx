// 내 정보 (시안). 계정·차량·정산 계좌.

import { MOCK_PROFILE } from "@/lib/mock/profile";
import { MYINFO_SECTIONS } from "@/lib/mock/myinfo";

export default function MyInfoPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">내 정보</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">계정 · 차량 · 정산 계좌를 한 곳에서</p>

      {/* 프로필 카드 */}
      <div className="flex items-center gap-[13px] rounded-2xl bg-[linear-gradient(135deg,#4F6AF5,#5d77ff)] p-[17px] text-white shadow-[0_8px_20px_rgba(79,106,245,0.26)]">
        <div className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-white/20 text-[19px] font-black">
          {MOCK_PROFILE.initial}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black">{MOCK_PROFILE.name}</span>
            <span className="rounded-full bg-jb-amber px-[7px] py-0.5 text-[10px] font-black text-[#7a5800]">
              {MOCK_PROFILE.grade}
            </span>
          </div>
          <div className="tnum mt-[3px] text-xs opacity-90">
            UID {MOCK_PROFILE.uid} · {MOCK_PROFILE.status}
          </div>
        </div>
      </div>

      {/* 정보 섹션들 */}
      {MYINFO_SECTIONS.map((sec) => (
        <div
          key={sec.title}
          className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 py-1.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
        >
          <div className="px-0 pb-[5px] pt-[11px] text-xs font-black text-jb-ink-mute">{sec.title}</div>
          {sec.rows.map((r) => (
            <div
              key={r.label}
              className="flex justify-between border-t border-jb-line-soft py-2.5"
            >
              <span className="text-[13px] text-jb-ink-soft">{r.label}</span>
              <span className="tnum text-[13px] font-bold" style={r.valueColor ? { color: r.valueColor } : undefined}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      ))}

      <button
        type="button"
        className="mt-3.5 w-full rounded-xl border border-jb-line bg-white py-[13px] text-sm font-bold text-jb-ink transition-transform active:scale-[.98]"
      >
        정보 수정하기
      </button>
    </div>
  );
}
