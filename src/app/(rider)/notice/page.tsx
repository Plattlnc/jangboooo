// 공지사항(라이더) — 게시된 공지 목록. 고정 우선·최신순. 클릭 시 상세.
import Link from "next/link";
import { ChevronRight, Pin } from "lucide-react";
import { getPublishedNotices } from "@/lib/notices";
import { noticePlainText } from "@/lib/sanitize-notice";
import type { NoticeRow } from "@/types/database";

export const dynamic = "force-dynamic";

function fmt(n: NoticeRow): string {
  const iso = n.published_at ?? n.created_at;
  return `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;
}

export default async function NoticePage() {
  const notices = await getPublishedNotices();

  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">공지사항</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">슬라이드 운영·정산 관련 안내</p>

      {notices.length === 0 ? (
        <div className="mt-2 rounded-[12px] border border-jb-line bg-white px-4 py-12 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13.5px] font-bold text-jb-ink">등록된 공지사항이 없어요</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-jb-ink-mute">새로운 공지가 올라오면 여기에서 확인할 수 있어요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <Link
              key={n.id}
              href={`/notice/${n.id}`}
              className="flex items-center gap-3 rounded-[12px] border border-jb-line bg-white px-4 py-3.5 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {n.is_pinned ? (
                    <Pin size={14} className="shrink-0 text-jb-indigo" fill="currentColor" aria-label="고정" />
                  ) : null}
                  {n.is_important ? (
                    <span className="rounded-full bg-jb-red-tint px-2 py-0.5 text-[10px] font-black text-jb-red">중요</span>
                  ) : null}
                  <span className="truncate text-[14px] font-black text-jb-ink">{n.title}</span>
                </div>
                <div className="mt-0.5 truncate text-[11.5px] text-jb-ink-mute">
                  {n.excerpt || noticePlainText(n.body).slice(0, 60)}
                </div>
                <div className="mt-1 text-[10.5px] font-semibold text-jb-ink-mute">{fmt(n)}</div>
              </div>
              <ChevronRight size={17} strokeWidth={2.2} className="shrink-0 text-jb-ink-mute" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
