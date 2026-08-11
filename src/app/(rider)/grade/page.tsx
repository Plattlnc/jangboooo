// 배달등급 — 준비 중(공백). 추후 등급 산정/노출 구현.

export default function GradePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">배달등급</h1>
      <div className="grid min-h-[60dvh] place-items-center">
        <span className="text-[12.5px] text-jb-ink-mute">준비 중입니다</span>
      </div>
    </div>
  );
}
