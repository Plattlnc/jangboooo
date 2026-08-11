// 공지 상세(라이더) — 게시된 공지 본문(sanitized HTML) 렌더.
// is_public 이 아니면 로그인 필수(로그인 후 이 공지로 복귀). 열람 시 고유 조회수 기록.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Pin } from "lucide-react";
import { getPublishedNotice } from "@/lib/notices";
import { getRiderSession } from "@/lib/auth/cookies";
import { DEMO_MODE } from "@/lib/demo";
import { NoticeShareButton } from "@/components/notice/notice-share-button";
import { NoticeViewPing } from "@/components/notice/notice-view-ping";
import type { NoticeRow } from "@/types/database";

export const dynamic = "force-dynamic";

function fmtFull(n: NoticeRow): string {
  const iso = n.published_at ?? n.created_at;
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getPublishedNotice(id);
  if (!n) notFound();

  // 링크 공개 공지가 아니면 로그인 게이트(데모/시크릿 미설정 환경은 미들웨어와 동일하게 비활성).
  if (!DEMO_MODE && process.env.SESSION_SECRET && !n.is_public) {
    const session = await getRiderSession();
    if (!session) redirect(`/login?next=${encodeURIComponent(`/notice/${id}`)}`);
  }

  return (
    <div className="px-3.5 pb-12 pt-3.5">
      <NoticeViewPing noticeId={n.id} />
      <div className="mb-3.5 flex items-center gap-2">
        <Link
          href="/notice"
          aria-label="공지 목록으로"
          className="grid size-8 shrink-0 place-items-center rounded-[8px] border border-jb-line bg-white active:bg-jb-line-soft"
        >
          <ChevronLeft size={18} strokeWidth={2.4} className="text-jb-ink" />
        </Link>
        <h1 className="text-[15px] font-black tracking-[-0.03em] text-jb-ink-mute">공지사항</h1>
        <div className="ml-auto">
          <NoticeShareButton noticeId={n.id} title={n.title} />
        </div>
      </div>

      <div className="rounded-2xl border border-jb-line bg-white px-[18px] py-[18px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="flex flex-wrap items-center gap-1.5">
          {n.is_pinned ? (
            <Pin size={15} className="shrink-0 text-jb-indigo" fill="currentColor" aria-label="고정" />
          ) : null}
          {n.is_important ? (
            <span className="rounded-full bg-jb-red-tint px-2 py-0.5 text-[10px] font-black text-jb-red">중요</span>
          ) : null}
        </div>
        <h2 className="mt-1.5 text-[19px] font-black leading-tight tracking-[-0.02em] text-jb-ink">{n.title}</h2>
        <div className="mt-1 text-[11.5px] font-semibold text-jb-ink-mute">
          {fmtFull(n)} · 조회 {n.view_count.toLocaleString()}
        </div>

        <div className="mt-4 border-t border-jb-line-soft pt-4">
          {/* body 는 저장 시 서버에서 sanitize 된 HTML */}
          <div className="notice-prose" dangerouslySetInnerHTML={{ __html: n.body || "<p>내용이 없습니다.</p>" }} />
        </div>
      </div>
    </div>
  );
}
