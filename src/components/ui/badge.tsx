import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn(cva) Badge — 05 §5. 상태 칩(success/warning 확장). 색 단독 의존 금지(텍스트/아이콘 동반).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-destructive-subtle text-destructive",
        info: "bg-primary-subtle text-primary",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant, icon, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {icon}
      {children}
    </span>
  );
}

export { badgeVariants };
