// 공지사항 관리(관리자) — 전체 목록(초안 포함). 작성/편집으로 이동.
import Link from "next/link";
import { Plus, Pin } from "lucide-react";
import { getAllNotices } from "@/lib/notices";
import { noticePlainText } from "@/lib/sanitize-notice";
import type { NoticeRow } from "@/types/database";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return iso.slice(0, 10).replaceAll("-", ".");
}

function Chips({ n }: { n: NoticeRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={
          "rounded-full px-2 py-0.5 text-[10px] font-black " +
          (n.is_published ? "bg-jb-green-tint text-jb-green" : "bg-jb-track text-jb-ink-mute")
        }
      >
        {n.is_published ? "게시" : "초안"}
      </span>
      {n.is_pinned ? <Pin size={14} className="shrink-0 text-jb-indigo" fill="currentColor" aria-label="고정" /> : null}
      {n.is_important ? <span className="rounded-full bg-jb-red-tint px-2 py-0.5 text-[10px] font-black text-jb-red">중요</span> : null}
      {n.is_featured ? <span className="rounded-full bg-jb-orange-tint px-2 py-0.5 text-[10px] font-black text-jb-orange">홈노출</span> : null}
    </div>
  );
}

export default async function AdminNoticesPage() {
  const notices = await getAllNotices();

  return (
    <div className="px-3.5 pb-24 pt-3.5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-black tracking-[-0.03em]">공지사항 관리</h1>
        <Link
          href="/admin/notices/new"
          className="inline-flex items-center gap-1 rounded-[10px] bg-jb-indigo px-3 py-2 text-[12.5px] font-black text-white transition-transform active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.6} />새 공지
        </Link>
      </div>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">라이더에게 노출할 공지를 작성·관리해요.</p>

      {notices.length === 0 ? (
        <div className="mt-2 rounded-[12px] border border-jb-line bg-white px-4 py-12 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
          <div className="text-[13.5px] font-bold text-jb-ink">아직 작성한 공지가 없어요</div>
          <p className="mt-1.5 text-[12px] text-jb-ink-mute">‘새 공지’로 첫 공지를 작성해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <Link
              key={n.id}
              href={`/admin/notices/${n.id}`}
              className="block rounded-[12px] border border-jb-line bg-white px-4 py-3 shadow-[0_1px_2px_0_rgba(0,0,0,0.04)] transition-colors active:bg-jb-line-soft"
            >
              <Chips n={n} />
              <div className="mt-1.5 truncate text-[14px] font-black text-jb-ink">{n.title}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-jb-ink-mute">
                {n.excerpt || noticePlainText(n.body).slice(0, 60) || "본문 없음"}
              </div>
              <div className="mt-1 text-[10.5px] text-jb-ink-mute">수정 {fmt(n.updated_at)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
