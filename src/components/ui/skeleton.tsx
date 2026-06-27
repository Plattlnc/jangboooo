import { cn } from "@/lib/cn";

// globals.css 의 .skeleton 시머 사용 (reduced-motion 시 정적). 레이아웃 시프트 0.
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
