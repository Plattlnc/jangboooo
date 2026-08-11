"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { BrandLogo } from "@/components/ui/brand-logo";
import { signInSettlement } from "@/actions/settlement-auth";

// 정산팀 로그인 — 단일 계정. 데스크톱 중앙 카드. 성공 시 하드 네비게이션(쿠키 반영).
export function SettlementLoginForm() {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const valid = id.trim().length > 0 && password.length > 0;

  async function onSubmit() {
    setError(undefined);
    if (!valid) {
      setError("아이디와 비밀번호를 입력해 주세요");
      return;
    }
    setLoading(true);
    try {
      const res = await signInSettlement({ id: id.trim(), password });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(next && next.startsWith("/settlement") ? next : "/settlement");
        return;
      }
      setLoading(false);
      setError(res.message);
    } catch {
      setLoading(false);
      setError("로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="grid size-14 place-items-center rounded-[16px] bg-jb-indigo-tint">
            <BrandLogo size={28} />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[20px] font-semibold tracking-[-0.02em] text-jb-ink">슬라이더</span>
              <span className="rounded-[7px] bg-jb-indigo-tint px-1.5 py-[3px] text-[11px] font-bold leading-none text-jb-indigo">
                정산
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-jb-ink-mute">정산팀 전용 · 라이더 정산 자동화</p>
          </div>
        </div>

        <form
          className="flex flex-col gap-4 rounded-[16px] border border-jb-line bg-jb-card p-6 shadow-[var(--toss-shadow)]"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <Field
            label="아이디"
            autoComplete="username"
            placeholder="아이디"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <Field
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            loadingLabel="확인하는 중…"
            disabled={!valid}
          >
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
}
