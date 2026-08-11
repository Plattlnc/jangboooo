"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/ui/brand-logo";
import { signInRider } from "@/actions/auth";
import { DEMO_MODE } from "@/lib/demo";
import { CREDS_COOKIE, decodeSavedLogin, type SavedLogin } from "@/lib/auth/session";

// #20 로그인: 라이더 ID + 비밀번호(4자리=휴대폰 뒤4) → backend signInRider(#19, '@/actions/auth').
// 실패는 사유 미구분(계정 열거 방지) — 서버 message 그대로 인라인 안내. DEMO_MODE 면 백엔드 우회.
//
// 아이디·비밀번호 저장 + 자동 로그인(본인 기기 전제, 사용자 명시 요구) — 3중 보존:
//  1) 서버 장수명 쿠키(rider_saved_login, 400일 + 미들웨어 연장) — 주 저장소.
//     localStorage 는 iOS 사파리 7일 미사용 삭제(ITP)에 걸리지만 서버 Set-Cookie 는 면제.
//  2) localStorage — 쿠키만 정리되는 경우 대비 보조 사본(+구버전 호환).
//  3) 브라우저 비밀번호 관리자(Credential Management API) — 구글 계정 동기화 시
//     브라우저 삭제·재설치·기기 변경까지 생존하는 유일한 경로. 저장분이 하나도 없으면
//     여기서 조용히 복원을 시도한다(silent — 팝업 없음, 미지원 브라우저는 무시).
// 자동 로그인은 진입당 1회만 시도하고, 명시적 로그아웃 직후(?out=1)는 건너뛴다
// — 안 그러면 로그아웃 → 자동 재로그인 루프로 로그아웃 자체가 불가능해진다.

const CREDS_KEY = "jangboooo.login.v1";

function loadFromLocalStorage(): SavedLogin | null {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLogin>;
    if (typeof parsed.id !== "string" || typeof parsed.pw !== "string") return null;
    return { id: parsed.id, pw: parsed.pw, auto: parsed.auto === true };
  } catch {
    return null;
  }
}

function loadFromCookie(): SavedLogin | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${CREDS_COOKIE}=([^;]*)`));
  if (!m) return null;
  try {
    return decodeSavedLogin(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/** 브라우저 비밀번호 관리자에 저장(크롬/엣지 — 구글 동기화로 재설치에도 생존). 미지원/거부는 무시. */
async function storeInPasswordManager(id: string, pw: string): Promise<void> {
  try {
    const Ctor = (
      window as Window & {
        PasswordCredential?: new (init: { id: string; password: string }) => Credential;
      }
    ).PasswordCredential;
    if (!Ctor || !("credentials" in navigator)) return;
    await navigator.credentials.store(new Ctor({ id, password: pw }));
  } catch {
    // 사파리 미지원 / 사용자 거부 — 폼 autocomplete 기반 네이티브 저장 제안에 맡긴다.
  }
}

/** 비밀번호 관리자에서 조용히(팝업 없이) 복원 — 자동 로그인 동의된 계정만 반환된다. */
async function getFromPasswordManager(): Promise<{ id: string; pw: string } | null> {
  try {
    if (!("credentials" in navigator)) return null;
    const cred = await navigator.credentials.get({
      password: true,
      mediation: "silent",
    } as CredentialRequestOptions);
    if (!cred || cred.type !== "password") return null;
    const pc = cred as Credential & { password?: string };
    if (typeof pc.password !== "string" || !/^\d{4}$/.test(pc.password)) return null;
    return { id: cred.id, pw: pc.password };
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
      void hydrateSaved();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만
  }, []);

  async function hydrateSaved() {
    const loggedOut = new URLSearchParams(window.location.search).has("out");

    const saved = loadFromCookie() ?? loadFromLocalStorage();
    if (saved) {
      setRiderId(saved.id);
      setPassword(saved.pw);
      setSaveCreds(true);
      setAutoLogin(saved.auto);
      if (saved.auto && !loggedOut && !autoAttempted.current) {
        autoAttempted.current = true;
        void doLogin(saved.id, saved.pw, { save: true, auto: true });
      }
      return;
    }

    // 기기 내 저장분 없음(브라우저 재설치·데이터 정리 등) → 비밀번호 관리자에서 복원 시도.
    const restored = await getFromPasswordManager();
    if (!restored) return;
    setRiderId(restored.id);
    setPassword(restored.pw);
    setSaveCreds(true);
    setAutoLogin(true);
    if (!loggedOut && !autoAttempted.current) {
      autoAttempted.current = true;
      // 성공하면 remember 로 서버 쿠키·localStorage 가 재구축된다.
      void doLogin(restored.id, restored.pw, { save: true, auto: true });
    }
  }

  function persistLocal(id: string, pw: string, opts: { save: boolean; auto: boolean }) {
    try {
      if (opts.save) {
        localStorage.setItem(CREDS_KEY, JSON.stringify({ id, pw, auto: opts.auto } satisfies SavedLogin));
      } else {
        localStorage.removeItem(CREDS_KEY);
      }
    } catch {
      // localStorage 불가(사파리 프라이빗 등) — 서버 쿠키가 주 저장소라 무해.
    }
  }

  async function doLogin(id: string, pw: string, opts: { save: boolean; auto: boolean }) {
    setError(undefined);
    setLoading(true);

    // 데모 모드: 백엔드 없이 대시보드(목)로 진입.
    if (DEMO_MODE) {
      persistLocal(id, pw, opts);
      window.location.assign("/dashboard");
      return;
    }

    try {
      // 서버 쿠키(rider_saved_login)는 remember 옵션으로 액션이 설정/삭제한다.
      const res = await signInRider({
        riderId: id,
        password: pw,
        remember: { save: opts.save, auto: opts.auto },
      });
      if (res.ok) {
        persistLocal(id, pw, opts);
        if (opts.save) await storeInPasswordManager(id, pw);
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
        <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
          <BrandLogo size={16} />
          슬라이드
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
