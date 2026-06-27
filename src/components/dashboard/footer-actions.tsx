"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toast, ToastViewport } from "@/components/ui/toast";
import { Refresh, Help } from "@/components/ui/icons";
import { signOutRider } from "@/actions/auth";

// 03 §G. 새로고침(전체 리패치) + 도움 + 로그아웃. 카피 SSOT: docs/copy/dashboard.md §7, microcopy.md.
export function FooterActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 3000);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await signOutRider();
    } finally {
      router.push("/login");
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2 pb-8 pt-2">
        <Button
          variant="secondary"
          size="md"
          loading={pending}
          loadingLabel="불러오는 중…"
          leftIcon={<Refresh size={18} />}
          onClick={refresh}
        >
          새로고침
        </Button>
        {/* TODO(m8): 문의/도움 연결 (별도 후속). 현재 placeholder. */}
        <Button variant="ghost" size="md" leftIcon={<Help size={18} />}>
          도움이 필요해요
        </Button>
        <Button variant="ghost" size="md" loading={loggingOut} onClick={logout}>
          로그아웃
        </Button>
      </div>
      {showToast ? (
        <ToastViewport>
          <Toast variant="success" message="최신 기록으로 새로워졌어요" />
        </ToastViewport>
      ) : null}
    </>
  );
}
