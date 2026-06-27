"use client";

import { Button } from "@/components/ui/button";
import { Kakao } from "@/components/ui/icons";

// 02 §S1 / 01 §A(kakao). 카카오 간편로그인 CTA. 색·심볼은 고정 자산(--kakao-*).
// 카피 SSOT: docs/copy/auth.md.
interface KakaoLoginButtonProps {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** 로그인 실패 인라인 메시지 (errors.md) */
  error?: string;
}

export function KakaoLoginButton({ onClick, loading, disabled, error }: KakaoLoginButtonProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="kakao"
        size="lg"
        fullWidth
        loading={loading}
        loadingLabel="잠깐만요…"
        disabled={disabled}
        onClick={onClick}
        leftIcon={<Kakao size={20} />}
      >
        카카오로 시작하기
      </Button>
      {error ? (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
