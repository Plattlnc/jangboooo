"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { signInRider } from "@/actions/auth";
import { DEMO_MODE } from "@/lib/demo";

// #20 로그인: 라이더 ID + 비밀번호(4자리=휴대폰 뒤4) → backend signInRider(#19, '@/actions/auth').
// 실패는 사유 미구분(계정 열거 방지) — 서버 message 그대로 인라인 안내. DEMO_MODE 면 백엔드 우회.
//
// 아이디·비밀번호 저장 + 자동 로그인: 본인 기기 전제의 localStorage 저장(사용자 요구).
// 자동 로그인은 진입당 1회만 시도하고, 명시적 로그아웃 직후(?out=1)는 건너뛴다
// — 안 그러면 로그아웃 → 자동 재로그인 루프로 로그아웃 자체가 불가능해진다.

const CREDS_KEY = "jangboooo.login.v1";

interface SavedCreds {
  id: string;
  pw: string;
  auto: boolean;
}

function loadSavedCreds(): SavedCreds | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedCreds>;
    if (typeof parsed.id !== "string" || typeof parsed.pw !== "string") return null;
    return { id: parsed.id, pw: parsed.pw, auto: parsed.auto === true };
  } catch {
    return null;
  }
}

export function RiderLoginForm() {
  const [riderId, setRiderId] = useState("");
  const [password, setPassword] = useState("");
  const [saveCreds, setSaveCreds] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const autoAttempted = useRef(false);

  const validId = riderId.trim().length > 0;
  const validPw = /^\d{4}$/.test(password);

  // 저장된 자격으로 프리필 + (로그아웃 직후가 아니면) 자동 로그인 1회.
  // rAF 경유 = 하이드레이션 이후로 미뤄 SSR 마크업(빈 폼)과의 불일치 방지 (theme-toggle 패턴).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const saved = loadSavedCreds();
      if (!saved) return;
      setRiderId(saved.id);
      setPassword(saved.pw);
      setSaveCreds(true);
      setAutoLogin(saved.auto);

      const loggedOut = new URLSearchParams(window.location.search).has("out");
      if (saved.auto && !loggedOut && !autoAttempted.current) {
        autoAttempted.current = true;
        void doLogin(saved.id, saved.pw, { save: true, auto: true });
      }
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만
  }, []);

  function persistCreds(id: string, pw: string, opts: { save: boolean; auto: boolean }) {
    try {
      if (opts.save) {
        localStorage.setItem(CREDS_KEY, JSON.stringify({ id, pw, auto: opts.auto } satisfies SavedCreds));
      } else {
        localStorage.removeItem(CREDS_KEY);
      }
    } catch {
      // localStorage 불가(사파리 프라이빗 등) — 저장만 조용히 포기, 로그인은 계속.
    }
  }

  async function doLogin(id: string, pw: string, opts: { save: boolean; auto: boolean }) {
    setError(undefined);
    setLoading(true);

    // 데모 모드: 백엔드 없이 대시보드(목)로 진입.
    if (DEMO_MODE) {
      persistCreds(id, pw, opts);
      window.location.assign("/dashboard");
      return;
    }

    try {
      const res = await signInRider({ riderId: id, password: pw });
      if (res.ok) {
        persistCreds(id, pw, opts);
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
    await doLogin(riderId.trim(), password, { save: saveCreds, auto: autoLogin });
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

        <div className="flex items-center gap-5">
          <label className="flex items-center gap-2 text-body text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={saveCreds}
              onChange={(e) => {
                setSaveCreds(e.target.checked);
                // 저장을 끄면 자동 로그인도 성립 불가.
                if (!e.target.checked) setAutoLogin(false);
              }}
            />
            아이디·비밀번호 저장
          </label>
          <label className="flex items-center gap-2 text-body text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={autoLogin}
              onChange={(e) => {
                setAutoLogin(e.target.checked);
                // 자동 로그인은 저장을 전제로 한다.
                if (e.target.checked) setSaveCreds(true);
              }}
            />
            자동 로그인
          </label>
        </div>

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
