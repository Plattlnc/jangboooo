"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Toast, ToastViewport } from "@/components/ui/toast";

// 02 §S3~S4. 휴대폰 번호 입력 → 인증번호 입력. 카피 SSOT: docs/copy/auth.md / errors.md.
//
// PROVISIONAL: 실제 문자 발송/검증/명단 매칭은 backend(카카오 본인확인 + admin_rider_id 바인딩)
// 도착 후 연결. 현재는 UI 상태 시연용 목 핸들러.
//   - 발송: 항상 성공(0.8s 지연)
//   - 검증: 코드 "000000" 이면 불일치 에러, 그 외 통과
//   - 매칭: 번호가 "0000" 으로 끝나면 명단 없음(S5b), 그 외 성공(S5a)

const RESEND_SECONDS = 180;

export interface VerifyResult {
  matched: boolean;
  name?: string;
  phoneMasked: string;
}

interface PhoneVerifyFormProps {
  onResult: (result: VerifyResult) => void;
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length < 11) return raw;
  return `${d.slice(0, 3)}-****-${d.slice(7)}`;
}

const isValidPhone = (raw: string) => /^010\d{8}$/.test(raw.replace(/\D/g, ""));

export function PhoneVerifyForm({ onResult }: PhoneVerifyFormProps) {
  const [sub, setSub] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState<string>();
  const [codeError, setCodeError] = useState<string>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // 인증번호 단계 타이머
  useEffect(() => {
    if (sub !== "code") return;
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [sub, secondsLeft]);

  function flashToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  // S3 — 문자 발송 (PROVISIONAL mock)
  function sendCode() {
    if (!isValidPhone(phone)) {
      setPhoneError("휴대폰 번호 형식을 확인해 주세요");
      return;
    }
    setPhoneError(undefined);
    setSending(true);
    window.setTimeout(() => {
      setSending(false);
      setSub("code");
      setSecondsLeft(RESEND_SECONDS);
      setCode("");
      setCodeError(undefined);
    }, 800);
  }

  function resend() {
    setSecondsLeft(RESEND_SECONDS);
    setCode("");
    setCodeError(undefined);
    flashToast("인증번호를 보냈어요");
  }

  // S4 — 검증 + 매칭 (PROVISIONAL mock)
  function verify() {
    if (code.length < 6) return;
    if (secondsLeft <= 0) {
      setCodeError("인증번호가 만료됐어요. 새 번호를 받아 주세요.");
      return;
    }
    setVerifying(true);
    window.setTimeout(() => {
      setVerifying(false);
      if (code === "000000") {
        setCodeError("인증번호가 맞지 않아요. 문자로 받은 6자리를 다시 확인해 주세요.");
        return;
      }
      const matched = !phone.replace(/\D/g, "").endsWith("0000");
      onResult({ matched, name: matched ? "라이더" : undefined, phoneMasked: maskPhone(phone) });
    }, 900);
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const expired = secondsLeft <= 0;

  if (sub === "phone") {
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-h2 text-fg">휴대폰 번호를 입력해 주세요</h2>
        <Field
          label="휴대폰 번호"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="010-0000-0000"
          value={phone}
          error={phoneError}
          loading={sending}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          helper="문자로 인증번호를 보내드려요."
        />
        <Button size="lg" fullWidth disabled={!isValidPhone(phone)} loading={sending} loadingLabel="보내는 중…" onClick={sendCode}>
          인증번호 받기
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 text-fg">문자로 받은 6자리 숫자를 입력해 주세요</h2>
        <p className="text-sm text-muted">{maskPhone(phone)} 로 보냈어요</p>
      </div>
      <Field
        label="인증번호"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="인증번호 6자리"
        className="tracking-[0.3em] tabular-nums"
        value={code}
        error={codeError}
        loading={verifying}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        trailing={
          <span className={expired ? "text-caption text-danger" : "text-caption text-muted tabular-nums"} aria-live="polite">
            {expired ? "만료됨" : `${mmss}`}
          </span>
        }
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!expired}
          onClick={resend}
          className="touch-target text-sm text-primary disabled:text-subtle disabled:pointer-events-none"
        >
          인증번호 다시 받기
        </button>
        {!expired ? (
          <span className="text-caption text-muted">{secondsLeft}초 후에 다시 받을 수 있어요</span>
        ) : null}
      </div>
      <Button size="lg" fullWidth disabled={code.length < 6} loading={verifying} loadingLabel="확인하는 중…" onClick={verify}>
        인증 완료하기
      </Button>
      <p className="text-caption text-muted text-center">
        이 점수와 기록은 평가가 아니라 내 기록이에요. 정산이나 배차에 영향을 주지 않아요.
      </p>
      {toast ? (
        <ToastViewport>
          <Toast variant="info" message={toast} />
        </ToastViewport>
      ) : null}
    </div>
  );
}
