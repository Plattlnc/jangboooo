// 티어 아이콘 — 배경 채움 없이 아이콘만(투명 PNG, /public/tiers/{key}.png).
// 배달등급/기록/프로필 등 여러 화면에서 공통 사용.

import Image from "next/image";
import type { Tier } from "@/lib/grade";

export function TierBadge({ tier, size = 44, className }: { tier: Tier; size?: number; className?: string }) {
  return (
    <Image
      src={`/tiers/${tier.key}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`shrink-0 select-none object-contain${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    />
  );
}
