"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { signInRider } from "@/actions/auth";
import { DEMO_MODE } from "@/lib/demo";

// #20 로그인: 라이더 ID + 비밀번호(4자리=휴대폰 뒤4) → backend signInRider(#19, '@/actions/auth').
// 실패는 사유 미구분(계정 열거 방지) — 서버 message 그대로 인라인 안내. DEMO_MODE 면 백엔드 우회.

export function RiderLoginForm() {
  const [riderId, setRiderId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const validId = riderId.trim().length > 0;
  const validPw = /^\d{4}$/.test(password);

  async function onSubmit() {
    setError(undefined);
    if (!validId) {
      setError("라이더 ID를 입력해 주세요");
      return;
    }
    if (!validPw) {
      setError("비밀번호는 숫자 4자리예요");
      return;
    }
    setLoading(true);

    // 데모 모드: 백엔드 없이 대시보드(목)로 진입.
    if (DEMO_MODE) {
      window.location.assign("/dashboard");
      return;
    }

    try {
      const res = await signInRider({ riderId: riderId.trim(), password });
      if (res.ok) {
        // 세션 쿠키는 액션이 설정함 → 하드 네비게이션으로 쿠키 확실히 실어 대시보드 진입
        // (client router.push 는 새 쿠키 인식 타이밍 문제로 무한로딩 가능 → window.location).
        window.location.assign("/dashboard");
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
    <div className="app-container flex min-h-dvh flex-col px-5 py-8">
      <div className="flex justify-end">
        <ThemeToggle className="-mr-2" />
      </div>

      <div className="flex flex-col gap-3 pt-8">
        <span className="text-caption text-muted-foreground">
          <span aria-hidden="true" className="emoji mr-1">🛵</span>배달장부2
        </span>
        <h1 className="text-h1 text-foreground">내 배달 성적표, 내 손안에.</h1>
        <p className="text-body text-muted-foreground">라이더 ID로 로그인해 내 실적을 확인해요.</p>
      </div>

      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
      >
        <Field
          label="라이더 ID"
          autoComplete="username"
          placeholder="관리시스템 라이더 ID"
          value={riderId}
          onChange={(e) => setRiderId(e.target.value)}
        />
        <Field
          label="비밀번호 (숫자 4자리)"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          placeholder="••••"
          className="tracking-[0.4em]"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/\D/g, "").slice(0, 4))}
          error={error}
        />
        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={loading}
          loadingLabel="확인하는 중…"
          disabled={!validId || !validPw}
        >
          로그인
        </Button>
      </form>

      <p className="mt-4 text-center text-caption text-muted-foreground">
        비밀번호는 등록된 휴대폰 번호 뒤 4자리예요.
      </p>
    </div>
  );
}
