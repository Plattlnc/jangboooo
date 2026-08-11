"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// 공지 공유 — 공개 링크(/n/[id])를 시스템 공유 시트로, 미지원 브라우저는 클립보드 복사.
export function NoticeShareButton({ noticeId, title }: { noticeId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/n/${noticeId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 공유 시트 취소 등 — 무시
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-[8px] border border-jb-line bg-white px-2.5 py-1.5 text-[12px] font-bold text-jb-ink transition-colors active:bg-jb-line-soft"
    >
      {copied ? (
        <Check size={14} strokeWidth={2.6} className="text-jb-green" />
      ) : (
        <Share2 size={14} strokeWidth={2.4} />
      )}
      {copied ? "복사됨" : "공유"}
    </button>
  );
}
