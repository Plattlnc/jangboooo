"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShieldCheck, Phone, Check } from "@/components/ui/icons";
import { KakaoLoginButton } from "./kakao-login-button";
import { PhoneVerifyForm } from "./phone-verify-form";

// 02 로그인/본인인증 플로우 오케스트레이터 (S1→S2→본인확인→S5a/S5b). 카피 SSOT: docs/copy/auth.md.
//
// 실연동(sla-api.md §3):
//   - S1: signInWithKakao() → 카카오 OAuth → /api/auth/callback → 세션.
//   - 본인확인: bindRider({verificationToken}) (sandbox: mock:<phone>).
// Supabase env 미설정(무백엔드)이면 데모 스텁으로 폴백 → 디자인/플로우 검증 유지.
//
// ⚠️ 운영 본인확인 = 카카오 본인확인(authcode redirect)이라 SMS형 S3/S4 화면과 상이.
//    + 로그인 후 본인확인 단계 재진입(세션 감지) UX 는 backend identity-initiate 헬퍼 + uxui
//    재설계 대기(team-lead 에스컬레이션). 지금은 sandbox(번호→mock 토큰)로 바인딩 검증.

const hasSupabaseEnv = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

type Step = "s1" | "s2" | "verify" | "s5a" | "s5b";

const RESET_DOTS: Step[] = ["s1", "s2", "verify"];

export function LoginFlow() {
  const [step, setStep] = useState<Step>("s1");
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState<string>();

  async function startKakao() {
    setKakaoError(undefined);
    setKakaoLoading(true);
    if (!hasSupabaseEnv()) {
      // 무백엔드 데모: 다음 단계로 진행(실제 OAuth 미호출).
      window.setTimeout(() => {
        setKakaoLoading(false);
        setStep("s2");
      }, 600);
      return;
    }
    try {
      const { signInWithKakao } = await import("@/lib/supabase/auth");
      // 로그인 후 /login 으로 복귀해 본인확인 이어서 진행(세션 재진입 UX 는 후속).
      await signInWithKakao("/login");
    } catch {
      setKakaoLoading(false);
      setKakaoError("로그인이 안 됐어요. 잠시 후 다시 시도해 주세요.");
    }
  }

  // 본인확인 → 바인딩. 성공 시 S5a, 명단없음 S5b, 그 외 인라인 에러 반환.
  async function verify(phoneDigits: string): Promise<{ error?: string }> {
    if (!hasSupabaseEnv()) {
      // 데모 스텁: 번호가 0000 으로 끝나면 명단없음(S5b).
      const matched = !phoneDigits.endsWith("0000");
      setStep(matched ? "s5a" : "s5b");
      return {};
    }
    try {
      const { bindRider } = await import("@/actions/bind-rider");
      // sandbox: verificationToken = mock:<phone> (IDENTITY_VERIFY_SANDBOX=true 필요).
      const res = await bindRider({ verificationToken: `mock:${phoneDigits}` });
      if (res.ok) {
        setStep("s5a");
        return {};
      }
      if (res.code === "RIDER_NOT_FOUND") {
        setStep("s5b");
        return {};
      }
      // AUTH_REQUIRED / PROVIDER_NOT_CONFIGURED / VERIFY_FAILED 등 → 인라인.
      return { error: res.message };
    } catch {
      return { error: "본인인증에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
  }

  return (
    <div className="app-container flex min-h-dvh flex-col px-5 py-8">
      {RESET_DOTS.includes(step) ? <StepDots step={step} /> : null}

      {step === "s1" && <StepS1 onStart={startKakao} loading={kakaoLoading} error={kakaoError} />}
      {step === "s2" && <StepS2 onNext={() => setStep("verify")} />}
      {step === "verify" && (
        <div className="flex flex-1 flex-col justify-center">
          <PhoneVerifyForm onVerify={verify} />
        </div>
      )}
      {step === "s5a" && <StepS5a name="라이더" />}
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

function StepS1({
  onStart,
  loading,
  error,
}: {
  onStart: () => void;
  loading: boolean;
  error?: string;
}) {
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
        <KakaoLoginButton onClick={onStart} loading={loading} error={error} />
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
        {/* TODO(m8): 문의 연결 (별도 후속). 현재 placeholder. */}
        <Button variant="ghost" size="md" fullWidth>
          문의하기
        </Button>
      </div>
    </div>
  );
}
