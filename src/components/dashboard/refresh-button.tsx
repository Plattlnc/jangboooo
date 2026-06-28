"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toast, ToastViewport } from "@/components/ui/toast";
import { Refresh } from "@/components/ui/icons";

// 06 §G. 새로고침(전체 리패치) — 우정렬. 카피 SSOT: dashboard.md §7, microcopy.md.
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
    setShowToast(true);
    window.setTimeout(() => setShowToast(false), 3000);
  }

  return (
    <>
      <div className="flex justify-end pb-8 pt-1">
        <Button
          variant="secondary"
          size="md"
          loading={pending}
          loadingLabel="갱신 중"
          leftIcon={<Refresh size={18} />}
          aria-label="새로고침"
          onClick={refresh}
        >
          새로고침
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
