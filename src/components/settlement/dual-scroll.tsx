"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// 넓은 표를 가로 스크롤할 때 상·하단 양쪽에 스크롤바 제공(동기화). 하단까지 안 내려가도 우측 컬럼 확인 가능.
export function DualScrollX({ children }: { children: ReactNode }) {
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const update = () => setWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const sync = (from: "top" | "bot") => {
    if (lock.current) return;
    lock.current = true;
    const a = from === "top" ? topRef.current : botRef.current;
    const b = from === "top" ? botRef.current : topRef.current;
    if (a && b) b.scrollLeft = a.scrollLeft;
    requestAnimationFrame(() => {
      lock.current = false;
    });
  };

  return (
    <div>
      {/* 상단 가로 스크롤바 */}
      <div ref={topRef} onScroll={() => sync("top")} className="dscroll-bar overflow-x-auto overflow-y-hidden">
        <div style={{ width, height: 1 }} />
      </div>
      {/* 실제 표(하단 가로 스크롤바) */}
      <div ref={botRef} onScroll={() => sync("bot")} className="dscroll-bar overflow-x-auto">
        <div ref={contentRef} className="w-max min-w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
