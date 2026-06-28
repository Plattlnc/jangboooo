"use client";

// ROADING 사고접수 위자드를 iframe 모달로 임베드. URL search params 로 라이더 정보 전달 →
// ROADING 쪽이 sessionStorage 에 흡수 → users.upsert(name, phone) + 차량번호 자동 입력.
// 제출 완료 시 ROADING 에서 postMessage 로 알림 → 모달 닫고 토스트 표시.
//
// 데모용: 라이더 정보는 props 로 받되, 없으면 더미 사용(시연 임팩트용).

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROADING_ORIGIN = "https://loading-app-two.vercel.app";

interface Props {
  riderId: string;
  riderName: string;
  riderPhone?: string;
  vehiclePlate?: string;
  insurerCode?: "samsung" | "db" | "hyundai";
}

interface PostMessageData {
  type?: string;
  displayNumber?: string | null;
  accidentId?: string | null;
}

export function EmergencyAccidentButton({
  riderId,
  riderName,
  riderPhone,
  vehiclePlate,
  insurerCode,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<{ displayNumber: string } | null>(null);

  const iframeUrl = (() => {
    const params = new URLSearchParams({
      rider_id: riderId,
      source: "jangboooo",
      name: riderName,
    });
    if (riderPhone) params.set("phone", riderPhone);
    if (vehiclePlate) params.set("plate", vehiclePlate);
    if (insurerCode) params.set("insurer", insurerCode);
    return `${ROADING_ORIGIN}/step1?${params.toString()}`;
  })();

  const close = useCallback(() => {
    setOpen(false);
    // 다음 열릴 때 깨끗한 상태로
    setTimeout(() => setSubmitted(null), 300);
  }, []);

  // ROADING iframe → 부모 메시지 수신 (제출 완료)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MessageEvent<PostMessageData>) => {
      if (e.origin !== ROADING_ORIGIN) return;
      const msg = e.data;
      if (msg?.type === "roading:accident-submitted" && msg.displayNumber) {
        setSubmitted({ displayNumber: msg.displayNumber });
        // 3초 후 자동 닫힘
        setTimeout(() => close(), 3000);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [open, close]);

  // ESC 닫기 + 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <>
      <Button
        variant="destructive"
        size="lg"
        fullWidth
        leftIcon={<AlertTriangle size={20} />}
        onClick={() => setOpen(true)}
      >
        사고접수 (ROADING 연동)
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사고접수"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4"
          onClick={close}
        >
          <div
            className="relative flex h-[90vh] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-destructive" />
                <span className="text-sm font-bold text-foreground">ROADING 사고접수</span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            {submitted ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                <CheckCircle2 size={64} className="text-green-600" />
                <h2 className="text-xl font-bold text-foreground">접수 완료!</h2>
                <div className="rounded-xl border border-border bg-muted/40 px-5 py-3 text-center">
                  <div className="text-xs font-medium text-muted-foreground">접수번호</div>
                  <div className="mt-1 font-mono text-lg font-bold tracking-wider text-destructive">
                    {submitted.displayNumber}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">곧 자동으로 닫힙니다…</p>
              </div>
            ) : (
              <iframe
                src={iframeUrl}
                title="ROADING 사고접수 위자드"
                allow="camera; geolocation; clipboard-write"
                className="flex-1 w-full border-0"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
