"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { unlockRiderSettings } from "@/actions/settlement-riders-auth";

// 라이더 설정/정산서 2차 잠금 화면 — 정산 세션 위에 추가 비밀번호 게이트(주민번호 등 민감정보 접근).
export function RidersUnlockForm({
  title = "라이더 설정",
  subtitle = "주민등록번호 등 민감정보가 포함되어 2차 비밀번호가 필요합니다.",
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("비밀번호를 입력해 주세요");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await unlockRiderSettings({ password });
      if (res.ok) {
        setPassword("");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-jb-ink">{title}</h1>
        <p className="mt-1 text-[13px] text-jb-ink-mute">{subtitle}</p>
      </div>

      <div className="mx-auto mt-6 w-full max-w-[380px] rounded-[16px] border border-jb-line bg-jb-card p-7 shadow-[var(--toss-shadow)]">
        <div className="grid size-12 place-items-center rounded-[14px] bg-jb-indigo-tint text-jb-indigo">
          <Lock size={22} />
        </div>
        <h2 className="mt-4 text-[16px] font-semibold text-jb-ink">2차 비밀번호 입력</h2>
        <p className="mt-1 text-[13px] text-jb-ink-mute">최고관리자 전용 페이지입니다.</p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-2.5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="2차 비밀번호"
            className="w-full rounded-[10px] border border-jb-line bg-jb-surface px-3.5 py-2.5 text-[14px] text-jb-ink outline-none focus:border-jb-indigo/60 placeholder:text-jb-ink-mute"
          />
          {error ? <p className="text-[12.5px] font-medium text-jb-red">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-1 w-full rounded-[10px] bg-jb-indigo py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "확인 중…" : "잠금 해제"}
          </button>
        </form>
      </div>
    </div>
  );
}
