// 새 공지 작성(관리자).
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NoticeForm } from "@/components/admin/notice-form";

export const dynamic = "force-dynamic";

export default function NewNoticePage() {
  return (
    <div className="px-3.5 pb-24 pt-3.5">
      <div className="mb-3.5 flex items-center gap-2">
        <Link
          href="/admin/notices"
          aria-label="공지 목록으로"
          className="grid size-8 shrink-0 place-items-center rounded-[12px] border border-jb-line bg-jb-card active:bg-jb-line-soft"
        >
          <ChevronLeft size={18} strokeWidth={2.4} className="text-jb-ink" />
        </Link>
        <h1 className="text-xl font-black tracking-[-0.03em]">새 공지</h1>
      </div>
      <NoticeForm initial={null} />
    </div>
  );
}
