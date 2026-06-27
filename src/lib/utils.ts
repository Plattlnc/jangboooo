import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn 표준 cn — clsx 조합 + tailwind-merge 충돌 해소. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
