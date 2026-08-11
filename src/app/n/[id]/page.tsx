// 공지 공유 페이지(공개 링크 /n/[id]) — 라이더 앱 크롬 없이 단독 열람.
// is_public 공지는 로그인 없이 누구나, 아니면 로그인 후에만(로그인 뒤 이 링크로 복귀).
// OG 메타(제목·요약)로 카톡/SNS 공유 미리보기 지원. 열람 시 고유 조회수 기록.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Pin } from "lucide-react";
import { getPublishedNotice } from "@/lib/notices";
import { noticePlainText } from "@/lib/sanitize-notice";
import { getRiderSession } from "@/lib/auth/cookies";
import { DEMO_MODE } from "@/lib/demo";
import { BrandLogo } from "@/components/ui/brand-logo";
import { NoticeShareButton } from "@/components/notice/notice-share-button";
import { NoticeViewPing } from "@/components/notice/notice-view-ping";
import type { NoticeRow } from "@/types/database";

export const dynamic = "force-dynamic";

function fmtFull(n: NoticeRow): string {
  const iso = n.published_at ?? n.created_at;
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const n = await getPublishedNotice(id);
  // 비공개(로그인 필요) 공지는 크롤러/미리보기에 내용 비노출.
  if (!n || !n.is_public) return { title: "공지사항 · 슬라이더" };
  const desc = n.excerpt || noticePlainText(n.body).slice(0, 120) || "슬라이더 공지사항";
  return {
    title: `${n.title} · 슬라이더 공지`,
    description: desc,
    openGraph: {
      type: "article",
      siteName: "슬라이더",
      title: n.title,
      description: desc,
      locale: "ko_KR",
      images: [{ url: "/og-slider-v2.png", width: 1200, height: 630, alt: "슬라이더" }],
    },
  };
}

export default async function PublicNoticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getPublishedNotice(id);
  if (!n) notFound();

  if (!DEMO_MODE && process.env.SESSION_SECRET && !n.is_public) {
    const session = await getRiderSession();
    if (!session) redirect(`/login?next=${encodeURIComponent(`/n/${id}`)}`);
  }

  return (
    <div className="app-container flex min-h-dvh flex-col bg-jb-surface text-jb-ink">
      <NoticeViewPing noticeId={n.id} />

      <header className="flex items-center gap-2 px-3.5 pb-2 pt-[calc(env(safe-area-inset-top)+14px)]">
        <Link href="/" className="flex items-center gap-2" aria-label="슬라이더 홈으로">
          <BrandLogo size={22} />
          <span className="text-[15px] font-black tracking-[-0.03em]">슬라이더</span>
        </Link>
        <Link
          href="/"
          className="ml-auto rounded-full bg-jb-indigo px-3.5 py-1.5 text-[12px] font-black text-white transition-transform active:scale-[0.98]"
        >
          앱에서 보기
        </Link>
      </header>

      <main className="flex-1 px-3.5 pb-12 pt-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-[15px] font-black tracking-[-0.03em] text-jb-ink-mute">공지사항</h1>
          <NoticeShareButton noticeId={n.id} title={n.title} />
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

        <div className="mt-3.5 rounded-2xl border border-jb-line bg-white px-[18px] py-4 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13px] font-black text-jb-ink">슬라이더 — 내 배달 실적 대시보드</div>
          <p className="mt-1 text-[11.5px] text-jb-ink-mute">완료·수락률·배달일지·등급까지 한눈에.</p>
          <Link
            href="/"
            className="mt-2.5 inline-block rounded-[10px] bg-jb-indigo px-4 py-2 text-[12.5px] font-black text-white transition-transform active:scale-[0.98]"
          >
            슬라이더 시작하기
          </Link>
        </div>
      </main>
    </div>
  );
}
