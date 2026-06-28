"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Menu, Moon, Sun, NotebookPen } from "lucide-react";
import { MenuDrawer } from "./menu-drawer";

// 06 §A. 앱바(고정, bg primary) — 좌:햄버거 / 중:워드마크 / 우:다크토글.
// 흰 텍스트/아이콘은 primary 위(06 §0-2: 대비 이슈는 lead 결정 대기).
// 워드마크: "배달장부(테스트)" — lead 확정(서비스명 그대로 유지).

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="다크 모드 전환"
      aria-pressed={mounted ? isDark : undefined}
      className="grid size-11 place-items-center rounded-full text-primary-foreground transition-transform hover:bg-white/10 active:scale-95"
    >
      {mounted && isDark ? <Sun size={24} strokeWidth={2} /> : <Moon size={24} strokeWidth={2} />}
    </button>
  );
}

export function AppBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[200] flex h-[50px] items-center justify-between bg-primary px-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="grid size-11 place-items-center rounded-full text-primary-foreground transition-transform hover:bg-white/10 active:scale-95"
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        <div className="flex items-center gap-1.5 text-primary-foreground">
          <NotebookPen size={18} strokeWidth={2} aria-hidden="true" />
          <span className="text-sm font-black">배달장부(테스트)</span>
        </div>

        <ThemeToggleButton />
      </header>

      <MenuDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
