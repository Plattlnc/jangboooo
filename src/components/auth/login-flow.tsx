"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck, Phone, Check } from "@/components/ui/icons";
import { KakaoLoginButton } from "./kakao-login-button";
import { PhoneVerifyForm, type VerifyResult } from "./phone-verify-form";

// 02 로그인/본인인증 플로우 오케스트레이터 (S1→S2→S3/S4→S5a/S5b).
// 카피 SSOT: docs/copy/auth.md.
//
// PROVISIONAL: 카카오 OAuth 리다이렉트는 backend Auth 도착 후 연결.
// 현재 카카오 버튼은 UI 시연을 위해 다음 스텝으로 진행시킨다(실제 OAuth 미호출).

type Step = "s1" | "s2" | "verify" | "s5a" | "s5b";

const RESET_DOTS: Step[] = ["s1", "s2", "verify"];

export function LoginFlow() {
  const [step, setStep] = useState<Step>("s1");
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  function startKakao() {
    // PROVISIONAL: 실제로는 supabase.auth.signInWithOAuth({ provider: 'kakao' }) 리다이렉트.
    setKakaoLoading(true);
    window.setTimeout(() => {
      setKakaoLoading(false);
      setStep("s2");
    }, 700);
  }

  function handleResult(r: VerifyResult) {
    setResult(r);
    setStep(r.matched ? "s5a" : "s5b");
  }

  return (
    <div className="app-container flex min-h-dvh flex-col px-5 py-8">
      {RESET_DOTS.includes(step) ? <StepDots step={step} /> : null}

      {step === "s1" && <StepS1 onStart={startKakao} loading={kakaoLoading} />}
      {step === "s2" && <StepS2 onNext={() => setStep("verify")} />}
      {step === "verify" && (
        <div className="flex flex-1 flex-col justify-center">
          <PhoneVerifyForm onResult={handleResult} />
        </div>
      )}
      {step === "s5a" && <StepS5a name={result?.name ?? "라이더"} />}
      {step === "s5b" && <StepS5b onRetry={() => setStep("verify")} />}
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["s1", "s2", "verify"];
  const idx = order.indexOf(step);
  return (
    <div className="flex justify-center gap-1.5 pb-6" aria-hidden="true">
      {order.map((s, i) => (
        <span
          key={s}
          className={`size-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </div>
  );
}

function StepS1({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 pt-8">
        <span className="text-caption text-muted">배달장부2</span>
        <h1 className="text-h1 text-fg">내 배달 성적표, 내 손안에.</h1>
        <p className="text-body text-muted">
          완료·수락률·취소까지, 내 실적을 오늘·주·월로 한눈에 봐요.
        </p>
      </div>

      <div className="flex flex-1" />

      <div className="flex flex-col gap-3">
        <KakaoLoginButton onClick={onStart} loading={loading} />
        <p className="text-center text-caption text-muted">
          카카오 계정으로 안전하게 로그인해요. 친구 목록이나 메시지는 가져오지 않아요.
        </p>
        <p className="text-center text-caption text-subtle">
          시작하면{" "}
          <Link href="#" className="text-primary underline">이용약관</Link>과{" "}
          <Link href="#" className="text-primary underline">개인정보 처리방침</Link>에 동의하게 돼요.
        </p>
      </div>
    </div>
  );
}

function StepS2({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Phone size={40} className="text-subtle" />
        <h2 className="text-h2 text-fg">휴대폰으로 내 기록을 찾을게요</h2>
        <p className="text-body text-muted">
          등록된 휴대폰 번호로 내 배달 기록을 안전하게 연결해요.
          <br />
          번호는 본인 확인과 기록 연결에만 쓰이고, 따로 저장해 마케팅에 쓰지 않아요.
        </p>
        <div className="flex items-start gap-2 rounded-md bg-primary-subtle p-4">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-fg">
            이 점수와 기록은 평가가 아니라 내 기록이에요. 정산이나 배차에 영향을 주지 않아요.
          </p>
        </div>
      </div>
      <Button size="lg" fullWidth onClick={onNext}>
        휴대폰 인증하기
      </Button>
    </div>
  );
}

function StepS5a({ name }: { name: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-success-subtle">
          <Check size={32} className="text-success" />
        </span>
        <h2 className="text-h2 text-fg">내 기록을 찾았어요</h2>
        <p className="text-body text-muted">
          {name}님의 배달 기록이 연결됐어요. 지금 바로 확인해 봐요.
        </p>
      </div>
      <Button size="lg" fullWidth onClick={() => router.push("/dashboard")}>
        내 대시보드 보기
      </Button>
    </div>
  );
}

function StepS5b({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<Phone size={40} />}
          title="연결할 기록을 못 찾았어요"
          description="이 번호로 등록된 라이더 기록이 없어요. 관리 담당자에게 등록된 번호가 맞는지 확인해 주세요."
        />
        <p className="text-center text-sm text-subtle">번호를 바꿔 다시 시도할 수도 있어요.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button size="lg" fullWidth onClick={onRetry}>
          다른 번호로 인증하기
        </Button>
        <Button variant="ghost" size="md" fullWidth>
          문의하기
        </Button>
      </div>
    </div>
  );
}
