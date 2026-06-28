"use client";

import { useState } from "react";
import { Camera, Check } from "lucide-react";
import {
  ROADING_TITLES,
  ROADING_DESCS,
  ROADING_BTNS,
  PHOTO_SLOTS,
  VERIFY_ITEMS,
  TRUST_SCORE,
} from "@/lib/mock/roading";

// ROADING 교통사고 접수 — 4단계 위저드(촬영 → 검증 → 신뢰점수 → 접수). 단계는 클라이언트 상태.

export function RoadingScreen() {
  const [step, setStep] = useState(0);

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#fff5f1_0%,#f6f7f9_38%)] px-3.5 pb-10 pt-4">
      <div className="flex items-center gap-2">
        <span className="bg-[linear-gradient(90deg,#FF6B35,#FF3B5C)] bg-clip-text text-[21px] font-black tracking-[-0.04em] text-transparent">
          ROADING
        </span>
        <span className="text-sm font-black text-jb-ink">교통사고 접수</span>
      </div>
      <p className="mt-[5px] text-[12.5px] leading-[1.5] text-jb-ink-soft">
        현장 데이터를 수집해 배달공제조합에
        <br />
        자동으로 접수해 드려요.
      </p>

      {/* 스테퍼 */}
      <div className="mx-0.5 my-[18px] mt-5 flex items-center">
        {[0, 1, 2, 3].map((i) => {
          const done = i < step;
          const cur = i === step;
          return (
            <div key={i} className="flex items-center" style={{ flex: i < 3 ? 1 : "0 0 auto" }}>
              <div
                className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-black"
                style={{
                  background: done ? "#FF3B5C" : cur ? "#fff" : "#f1f2f4",
                  color: done ? "#fff" : cur ? "#FF3B5C" : "#9b9588",
                  border: cur ? "2px solid #FF3B5C" : "0",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              {i < 3 ? (
                <div className="mx-1 h-0.5 flex-1" style={{ background: i < step ? "#FF3B5C" : "#f1f2f4" }} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* 단계 카드 */}
      <div className="rounded-[18px] border border-jb-line bg-white p-[18px] shadow-[0_2px_10px_rgba(20,23,46,0.05)]">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[linear-gradient(90deg,#FF6B35,#FF3B5C)] px-2.5 py-[3px] text-[11px] font-black text-white">
            STEP {step + 1}/4
          </span>
          <span className="text-[15px] font-black tracking-[-0.02em]">{ROADING_TITLES[step]}</span>
        </div>
        <p className="mt-[9px] text-[12.5px] leading-[1.55] text-jb-ink-soft">{ROADING_DESCS[step]}</p>

        {/* 단계별 본문 */}
        {step === 0 ? (
          <div className="mt-[15px] grid grid-cols-2 gap-2.5">
            {PHOTO_SLOTS.map((ps) => (
              <div
                key={ps}
                className="flex aspect-square flex-col items-center justify-center gap-[7px] rounded-[13px] border-[1.5px] border-dashed border-[#f1c5b2] bg-[repeating-linear-gradient(45deg,#fff7f3,#fff7f3_7px,#fdeee6_7px,#fdeee6_14px)]"
              >
                <Camera size={24} strokeWidth={2} className="text-jb-flame" />
                <span className="text-[11.5px] font-bold text-[#c2410c]">{ps}</span>
              </div>
            ))}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-[15px] flex flex-col gap-[9px]">
            {VERIFY_ITEMS.map((v) => (
              <div
                key={v.label}
                className="flex items-center gap-[11px] rounded-xl border border-jb-line bg-[#f8f9fb] px-[13px] py-3"
              >
                <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-jb-green-tint text-jb-green">
                  <Check size={13} strokeWidth={3} />
                </span>
                <div className="flex-1">
                  <div className="text-[13px] font-bold">{v.label}</div>
                  <div className="mt-px text-[11.5px] text-jb-ink-mute">{v.detail}</div>
                </div>
                <span className="text-[11px] font-black text-jb-green">{v.status}</span>
              </div>
            ))}
          </div>
        ) : null}

        {step >= 2 ? (
          <div className="mt-4 flex flex-col items-center">
            <div className="grid size-[130px] place-items-center rounded-full bg-[conic-gradient(#FF3B5C_338deg,#ffe1e7_0deg)]">
              <div className="grid size-[100px] place-items-center rounded-full bg-white">
                <span className="tnum text-[34px] font-black leading-none text-jb-coral">{TRUST_SCORE}</span>
                <span className="mt-0.5 text-[11px] font-bold text-jb-ink-mute">신뢰 점수</span>
              </div>
            </div>
            <div className="mt-3.5 w-full rounded-xl border border-[#fbdcd0] bg-[#fff5f1] px-[15px] py-[13px]">
              <div className="text-[13px] font-black text-[#c2410c]">자동 접수 준비 완료</div>
              <div className="mt-1 text-xs leading-[1.5] text-jb-ink-soft">
                수집된 현장 데이터가 검증되었어요. 배달공제조합으로 접수를 진행합니다.
              </div>
            </div>
          </div>
        ) : null}

        {/* 네비 버튼 */}
        <div className="mt-[18px] flex gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(s - 1, 0))}
              className="shrink-0 basis-[88px] rounded-xl border border-jb-line bg-white py-[13px] text-[13.5px] font-bold text-jb-ink-soft"
            >
              이전
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, 3))}
            className="flex-1 rounded-xl bg-[linear-gradient(90deg,#FF6B35,#FF3B5C)] py-[13px] text-sm font-black text-white shadow-[0_6px_16px_rgba(255,80,80,0.3)]"
          >
            {ROADING_BTNS[step]}
          </button>
        </div>
      </div>
    </div>
  );
}
