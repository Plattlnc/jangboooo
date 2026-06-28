// 배달뉴스 (시안). 라이더 업계 소식.

import { NEWS_FEATURED, NEWS_LIST } from "@/lib/mock/news";

export default function NewsPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <div className="mb-1 flex items-center gap-2.5">
        <h1 className="text-xl font-black tracking-[-0.03em]">배달뉴스</h1>
        <span className="rounded-full bg-jb-teal-tint px-2.5 py-[3px] text-[11px] font-bold text-jb-teal">
          매일 업데이트
        </span>
      </div>
      <p className="mb-3.5 text-[12.5px] text-jb-ink-mute">라이더에게 꼭 필요한 업계 소식</p>

      {/* 피처드 */}
      <article className="overflow-hidden rounded-2xl border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]">
        <div className="flex h-[158px] items-end bg-[repeating-linear-gradient(45deg,#e3f6f6,#e3f6f6_11px,#d4f0f0_11px,#d4f0f0_22px)] p-[13px]">
          <span className="rounded-lg bg-jb-teal px-2.5 py-1 text-[11px] font-black text-white">
            {NEWS_FEATURED.badge}
          </span>
        </div>
        <div className="p-[15px]">
          <h2 className="text-pretty text-base font-black leading-[1.4] tracking-[-0.02em]">
            {NEWS_FEATURED.title}
          </h2>
          <p className="mt-2 text-[12.5px] leading-[1.55] text-jb-ink-soft">{NEWS_FEATURED.body}</p>
          <div className="mt-[11px] flex items-center gap-[7px] text-[11.5px] text-jb-ink-mute">
            <span className="font-bold text-jb-teal">{NEWS_FEATURED.source}</span>
            <span>·</span>
            <span className="tnum">{NEWS_FEATURED.time}</span>
          </div>
        </div>
      </article>

      {/* 리스트 */}
      <div className="mt-3.5 flex flex-col gap-0.5">
        {NEWS_LIST.map((a) => (
          <div key={a.title} className="flex gap-[13px] border-b border-jb-line-soft px-0.5 py-[13px]">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-black" style={{ color: a.tagColor }}>
                {a.tag}
              </span>
              <div className="mt-[5px] text-pretty text-[13.5px] font-bold leading-[1.42] tracking-[-0.02em]">
                {a.title}
              </div>
              <div className="tnum mt-[7px] text-[11.5px] text-jb-ink-mute">{a.meta}</div>
            </div>
            <div className="size-[74px] shrink-0 rounded-[11px] bg-[repeating-linear-gradient(45deg,#eef0f3,#eef0f3_8px,#e4e7ec_8px,#e4e7ec_16px)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
