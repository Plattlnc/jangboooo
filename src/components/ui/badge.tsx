import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// 01-component-library §E. 상태 칩. 색 단독 의존 금지 → 항상 텍스트/아이콘 동반.

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const VARIANTS: Record<BadgeVariant, string> = {
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
  neutral: "bg-surface-sunken text-muted",
};

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "neutral", icon, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
