// 라인 아이콘 셋 (stroke 1.5, 24px 기준, currentColor) — 00-foundations §7.
// 외부 아이콘 라이브러리 대신 필요한 아이콘만 인라인 SVG 로 보유(번들 최소·시각 일관).
import type { SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Svg({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const ArrowUp = (p: IconProps) => (
  <Svg {...p}><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></Svg>
);
export const ArrowDown = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></Svg>
);
export const Minus = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14" /></Svg>
);
export const Info = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Svg>
);
export const Refresh = (p: IconProps) => (
  <Svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></Svg>
);
export const Check = (p: IconProps) => (
  <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
);
export const ShieldCheck = (p: IconProps) => (
  <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const Alert = (p: IconProps) => (
  <Svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Svg>
);
export const Help = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></Svg>
);
export const Phone = (p: IconProps) => (
  <Svg {...p}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></Svg>
);
export const TrendUp = (p: IconProps) => (
  <Svg {...p}><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></Svg>
);
export const Kakao = (p: IconProps) => (
  // 카카오 말풍선 심볼(고정 자산). 단색 currentColor.
  <Svg {...p} stroke="none" fill="currentColor">
    <path d="M12 3C6.9 3 3 6.3 3 10.3c0 2.6 1.7 4.9 4.3 6.2-.2.7-.7 2.5-.8 2.9-.1.5.2.5.4.4.2-.1 2.6-1.7 3.6-2.4.5.1 1 .1 1.5.1 5.1 0 9-3.3 9-7.3S17.1 3 12 3Z" />
  </Svg>
);
