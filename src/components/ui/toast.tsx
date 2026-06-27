"use client";

import { cn } from "@/lib/cn";
import { Check, Alert, Info } from "./icons";

// 01-component-library §H. 일시 알림(프레젠테이션). 등장은 호출측 마운트로 제어.
export type ToastVariant = "success" | "danger" | "info";

const ICON = {
  success: <Check className="text-success" size={20} />,
  danger: <Alert className="text-destructive" size={20} />,
  info: <Info className="text-primary" size={20} />,
};

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  className?: string;
}

export function Toast({ variant = "info", message, className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live={variant === "danger" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-md bg-popover px-4 py-3 shadow-lg",
        "border border-border",
        className,
      )}
    >
      <span className="shrink-0">{ICON[variant]}</span>
      <span className="text-sm text-foreground">{message}</span>
    </div>
  );
}

/** 화면 하단 고정 토스트 컨테이너 (app-container 폭 내 중앙). */
export function ToastViewport({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[500] flex justify-center px-5">
      <div className="app-container flex justify-center">{children}</div>
    </div>
  );
}
