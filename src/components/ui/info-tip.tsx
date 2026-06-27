"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { Info } from "./icons";

// 탭-토글 disclosure (DESIGN-QA M1): 네이티브 title 은 모바일에서 탭 시 안 뜸 →
// aria-expanded + aria-describedby 로 접근성 보장 + 탭하면 보조 설명 노출.
// 설명 노드는 항상 DOM 에 두되 닫힘 상태에선 sr-only(스크린리더는 항상 읽고, 시각은 탭 시 노출).
interface InfoTipProps {
  /** aria-label (예: "SLA 점수 설명") */
  label: string;
  /** 보조 설명 텍스트 */
  text: string;
  size?: number;
}

export function InfoTip({ label, text, size = 14 }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((o) => !o)}
        className="touch-target -m-2 grid place-items-center text-muted-foreground"
      >
        <Info size={size} />
      </button>
      <span
        id={id}
        role="note"
        className={cn(
          open
            ? "absolute left-0 top-full z-[200] mt-1 w-56 rounded-md border border-border bg-popover p-2 text-caption text-muted-foreground shadow-lg"
            : "sr-only",
        )}
      >
        {text}
      </span>
    </span>
  );
}
