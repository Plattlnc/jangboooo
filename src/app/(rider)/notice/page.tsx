// 공지사항 — 준비 중(빈 상태). 추후 공지 목록/상세 구현.

export const dynamic = "force-dynamic";

export default function NoticePage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">공지사항</h1>
      <p className="mb-3.5 mt-1 text-[12.5px] text-jb-ink-mute">슬라이드 운영·정산 관련 안내</p>

      <div className="mt-2 rounded-[12px] border border-jb-line bg-white px-4 py-12 text-center shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]">
        <div className="text-[13.5px] font-bold text-jb-ink">등록된 공지사항이 없어요</div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-jb-ink-mute">
          새로운 공지가 올라오면 여기에서 확인할 수 있어요.
        </p>
      </div>
    </div>
  );
}
