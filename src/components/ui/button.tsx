import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

// shadcn(cva) Button — 05 §5 매핑. variant: primary(=default)/secondary/ghost/outline/destructive
// + kakao(고정 브랜드색). loading/leftIcon/fullWidth 는 래퍼 확장. 토큰=05 §2.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold " +
    "outline-none transition-[transform,background-color,box-shadow] duration-150 ease-[var(--ease-standard)] " +
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-50 active:scale-[.97]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-primary hover:bg-primary-subtle",
        outline: "border border-border bg-transparent hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        kakao: "bg-kakao text-kakao-foreground hover:brightness-95",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-base",
        lg: "h-[52px] px-5 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingLabel?: string;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
}

export function Button({
  variant,
  size,
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
      className={cn(buttonVariants({ variant, size }), fullWidth && "w-full", className)}
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

export { buttonVariants };
