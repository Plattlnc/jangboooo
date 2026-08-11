"use client";

import { useEffect, useRef } from "react";
import { recordNoticeView } from "@/actions/notice-views";

// 공지 상세 열람 1회 기록(fire-and-forget). 서버가 뷰어 단위 dedupe 하므로
// StrictMode 이중 실행·재방문은 카운트에 영향 없음.
export function NoticeViewPing({ noticeId }: { noticeId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void recordNoticeView(noticeId);
  }, [noticeId]);
  return null;
}
