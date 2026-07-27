"use client";

import { useState, useTransition } from "react";
import { saveRiderProfile } from "@/actions/profile";
import { Toast, ToastViewport } from "@/components/ui/toast";

// 내정보 등록 폼 — 실 사용자 이름/연락처 + 운행 바이크(번호판, 기종).
// 저장값은 ROADING 사고접수 임베드 프리필(이름·연락처·번호판·기종)에 쓰인다.

interface Props {
  initial: {
    realName: string;
    realPhone: string;
    bikePlate: string;
    bikeModel: string;
  };
}

interface Field {
  key: keyof Props["initial"];
  label: string;
  placeholder: string;
  inputMode?: "tel";
  maxLength: number;
}

const FIELDS: Field[] = [
  { key: "realName", label: "실 사용자 이름", placeholder: "예) 김건우", maxLength: 30 },
  { key: "realPhone", label: "실 사용자 번호", placeholder: "예) 010-1234-5678", inputMode: "tel", maxLength: 13 },
  { key: "bikePlate", label: "바이크 번호판", placeholder: "예) 서울강남차1234", maxLength: 12 },
  { key: "bikeModel", label: "바이크 기종", placeholder: "예) PCX 125", maxLength: 30 },
];

export function ProfileForm({ initial }: Props) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ variant: "success" | "danger"; message: string } | null>(null);

  const showToast = (variant: "success" | "danger", message: string) => {
    setToast({ variant, message });
    window.setTimeout(() => setToast(null), 2200);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveRiderProfile(values);
      showToast(res.ok ? "success" : "danger", res.message);
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mt-3 rounded-[14px] border border-jb-line bg-white px-4 pb-4 pt-1.5 shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
    >
      <div className="pb-1 pt-[11px] text-xs font-black text-jb-ink-mute">
        실사용자 · 바이크 등록
      </div>
      <p className="pb-2 text-[11.5px] leading-relaxed text-jb-ink-soft">
        등록해두면 사고접수(ROADING) 시 이름·연락처·차량 정보가 자동으로 채워져요.
      </p>

      <div className="space-y-2.5">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[12px] font-bold text-jb-ink-soft">{f.label}</span>
            <input
              type="text"
              inputMode={f.inputMode}
              value={values[f.key]}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full rounded-[11px] border border-jb-line bg-[#f8f9fb] px-3.5 py-[11px] text-[14px] font-semibold text-jb-ink outline-none transition-colors placeholder:font-normal placeholder:text-[#b0b6c3] focus:border-jb-indigo focus:bg-white"
            />
          </label>
        ))}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-3.5 w-full rounded-xl bg-jb-indigo py-[13px] text-sm font-bold text-white transition-transform active:scale-[.98] disabled:opacity-60"
      >
        {pending ? "저장 중..." : "저장하기"}
      </button>

      {toast ? (
        <ToastViewport>
          <Toast variant={toast.variant} message={toast.message} />
        </ToastViewport>
      ) : null}
    </form>
  );
}
