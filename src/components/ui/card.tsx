import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// shadcn(05 §5) 표면 컨테이너. bg-card/text-card-foreground, rounded-xl, border-border, shadow-sm.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 md:p-5",
        className,
      )}
      {...props}
    />
  );
}
