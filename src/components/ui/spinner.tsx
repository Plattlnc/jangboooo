import { cn } from "@/lib/cn";

const SIZES = { sm: 16, md: 20, lg: 24 } as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  label?: string;
}

/** 인라인 로딩 인디케이터 (currentColor 회전). 01-component-library §H. */
export function Spinner({ size = "md", className, label = "로딩 중" }: SpinnerProps) {
  const px = SIZES[size];
  return (
    <svg
      role="status"
      aria-label={label}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
