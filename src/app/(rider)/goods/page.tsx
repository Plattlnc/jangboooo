// 라이더 용품 (시안). 배달 필수템 그리드.

import { GOODS_CATS, GOODS_ITEMS } from "@/lib/mock/goods";

export default function GoodsPage() {
  return (
    <div className="px-3.5 pb-10 pt-3.5">
      <h1 className="text-xl font-black tracking-[-0.03em]">라이더 용품</h1>
      <p className="my-1 mb-3.5 text-[12.5px] text-jb-ink-mute">현장에서 검증된 배달 필수템</p>

      {/* 카테고리 칩 */}
      <div className="mb-3.5 flex gap-[7px] overflow-x-auto pb-[3px]">
        {GOODS_CATS.map((c, i) => (
          <button
            key={c}
            type="button"
            className={
              "shrink-0 whitespace-nowrap rounded-full px-[15px] py-2 text-[12.5px] font-bold " +
              (i === 0 ? "bg-jb-green text-white" : "border border-jb-line bg-white text-jb-ink-soft")
            }
          >
            {c}
          </button>
        ))}
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {GOODS_ITEMS.map((p) => (
          <div
            key={p.name}
            className="overflow-hidden rounded-[14px] border border-jb-line bg-white shadow-[0_1px_2px_rgba(20,23,46,0.04)]"
          >
            <div className="relative aspect-[1.05] bg-[repeating-linear-gradient(45deg,#f4f6fa,#f4f6fa_9px,#e9edf3_9px,#e9edf3_18px)]">
              {p.badge ? (
                <span className="absolute left-2 top-2 rounded-md bg-jb-green px-2 py-[3px] text-[10px] font-black text-white">
                  {p.badge}
                </span>
              ) : null}
            </div>
            <div className="px-3 pb-[13px] pt-[11px]">
              <div className="text-[13px] font-bold leading-[1.35] tracking-[-0.02em]">{p.name}</div>
              <div className="mt-[7px] flex items-baseline gap-[5px]">
                <span className="text-[11px] font-black text-jb-red">{p.discount}</span>
                <span className="tnum text-[15px] font-black">{p.price}</span>
              </div>
              <div className="mt-[3px] text-[11px] text-jb-ink-mute">
                ★ {p.rating} · 리뷰 {p.reviews}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
