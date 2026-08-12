// 티어 아이콘 — 등급별 색이 적용된 메달(리본 + 원형 디스크 + 별) SVG.
// 배달등급/기록/프로필 등 여러 화면에서 공통 사용. (구 바퀴모양 PNG 대체)

import type { Tier } from "@/lib/grade";

/** 5각 별 path — 중심(cx,cy), 외/내 반지름. */
function starPath(cx: number, cy: number, outerR: number, innerR: number, spikes = 5): string {
  let d = "";
  let rot = -Math.PI / 2;
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes; i++) {
    d += (i === 0 ? "M" : "L") + (cx + Math.cos(rot) * outerR).toFixed(2) + "," + (cy + Math.sin(rot) * outerR).toFixed(2);
    rot += step;
    d += "L" + (cx + Math.cos(rot) * innerR).toFixed(2) + "," + (cy + Math.sin(rot) * innerR).toFixed(2);
    rot += step;
  }
  return d + "Z";
}

export function TierBadge({ tier, size = 44, className }: { tier: Tier; size?: number; className?: string }) {
  const c = tier.color;
  const gid = `tier-medal-${tier.key}`;

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={`shrink-0 select-none${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.14" />
        </radialGradient>
      </defs>

      {/* 리본(두 가닥) — 디스크 뒤 */}
      <path d="M15,4 L22,4 L25,21 L18,23 Z" fill={c} />
      <path d="M33,4 L26,4 L23,21 L30,23 Z" fill={c} />
      <path d="M15,4 L22,4 L25,21 L18,23 Z" fill="#000" opacity="0.14" />
      <path d="M33,4 L26,4 L23,21 L30,23 Z" fill="#000" opacity="0.14" />

      {/* 메달 디스크 */}
      <circle cx="24" cy="32" r="14" fill={c} />
      <circle cx="24" cy="32" r="14" fill={`url(#${gid})`} />
      <circle cx="24" cy="32" r="14" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.6" />
      <circle cx="24" cy="32" r="10.5" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />

      {/* 중앙 별 */}
      <path d={starPath(24, 32, 6.3, 2.7)} fill="#ffffff" fillOpacity="0.95" />
    </svg>
  );
}
