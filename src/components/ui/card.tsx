import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// 01-component-library §C. 표면 컨테이너 기본.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-card shadow-card border border-border p-4 md:p-5",
        className,
      )}
      {...props}
    />
  );
}
