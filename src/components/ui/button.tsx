import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

// 01-component-library §A. 3 사이즈 × 4 변형 + 상태(loading/disabled/focus).
// 색/크기 하드코딩 없음 — 토큰 유틸만.

type Variant = "primary" | "secondary" | "ghost" | "kakao";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold " +
  "transition-[transform,background-color,box-shadow] duration-150 ease-[var(--ease-standard)] " +
  "select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed " +
  "active:scale-[.97]";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-body", // 44px — 터치 최소
  lg: "h-[52px] px-5 text-body", // 주요 CTA
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "bg-surface text-fg border border-border-strong hover:bg-surface-sunken",
  ghost: "text-primary hover:bg-primary-subtle",
  kakao: "bg-kakao text-kakao-fg hover:brightness-95",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  fullWidth = false,
  leftIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, SIZES[size], VARIANTS[variant], fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === "lg" ? "md" : "sm"} className="text-current" />
          {loadingLabel ? <span>{loadingLabel}</span> : null}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  );
}
