// 슬라이드 브랜드 로고("S") — 라이트=검정(logo-black), 다크=흰색(logo-white) 자동 전환.
// .dark 클래스 기반(next-themes). 두 이미지를 모두 렌더하고 테마별로 하나만 표시.

export function BrandLogo({ size = 24, className }: { size?: number; className?: string }) {
  const base = `shrink-0 select-none object-contain${className ? ` ${className}` : ""}`;
  const dim = { width: size, height: size };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 브랜드 로고, 고정 크기 */}
      <img src="/logo-black.png" alt="슬라이드" width={size} height={size} style={dim} className={`${base} block dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element -- 로컬 브랜드 로고, 고정 크기 */}
      <img src="/logo-white.png" alt="" aria-hidden="true" width={size} height={size} style={dim} className={`${base} hidden dark:block`} />
    </>
  );
}
