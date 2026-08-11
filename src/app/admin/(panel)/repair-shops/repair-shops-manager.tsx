"use client";

import { useState, useTransition } from "react";
import { Phone, MapPin, Plus } from "lucide-react";
import { addRepairShop, toggleRepairShop, deleteRepairShop } from "@/actions/repair-shops";
import { Toast, ToastViewport } from "@/components/ui/toast";
import type { RepairShopRow } from "@/types/database";

// 정비소 등록 폼 + 목록 관리(노출 토글/삭제). 목록 갱신은 서버 revalidatePath 에 의존.

interface Props {
  shops: RepairShopRow[];
}

const EMPTY_FORM = { name: "", phone: "", address: "", note: "" };

export function RepairShopsManager({ shops }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ variant: "success" | "danger"; message: string } | null>(null);

  const showToast = (variant: "success" | "danger", message: string) => {
    setToast({ variant, message });
    window.setTimeout(() => setToast(null), 2200);
  };

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addRepairShop(form);
      showToast(res.ok ? "success" : "danger", res.message);
      if (res.ok) setForm(EMPTY_FORM);
    });
  };

  const onToggle = (shop: RepairShopRow) => {
    startTransition(async () => {
      const res = await toggleRepairShop(shop.id, !shop.is_active);
      showToast(res.ok ? "success" : "danger", res.message);
    });
  };

  const onDelete = (shop: RepairShopRow) => {
    if (!window.confirm(`'${shop.name}' 정비소를 삭제할까요?`)) return;
    startTransition(async () => {
      const res = await deleteRepairShop(shop.id);
      showToast(res.ok ? "success" : "danger", res.message);
    });
  };

  const inputCls =
    "w-full rounded-[12px] border border-jb-line bg-[#f2f4f6] px-3 py-[9px] text-[13.5px] font-semibold text-jb-ink outline-none transition-colors placeholder:font-normal placeholder:text-[#b0b6c3] focus:border-jb-indigo focus:bg-jb-card";

  return (
    <>
      {/* 등록 폼 */}
      <form
        onSubmit={onAdd}
        className="mt-1.5 rounded-[18px] border border-jb-line bg-jb-card px-[13px] py-[11px] shadow-[var(--toss-shadow)]"
      >
        <div className="mb-2 text-[12.5px] font-black text-jb-ink">정비소 등록</div>
        <div className="space-y-2">
          <input
            type="text"
            value={form.name}
            maxLength={40}
            placeholder="정비소 이름 (필수) 예) 서구바이크정비"
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              inputMode="tel"
              value={form.phone}
              maxLength={20}
              placeholder="전화번호"
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className={inputCls}
            />
            <input
              type="text"
              value={form.note}
              maxLength={80}
              placeholder="메모 예) 평일 09~19시"
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className={inputCls}
            />
          </div>
          <input
            type="text"
            value={form.address}
            maxLength={80}
            placeholder="주소 예) 인천 서구 ○○로 12"
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className={inputCls}
          />
        </div>
        <button
          type="submit"
          disabled={pending || !form.name.trim()}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-jb-indigo py-[11px] text-[13px] font-bold text-white transition-transform active:scale-[.98] disabled:opacity-50"
        >
          <Plus size={15} strokeWidth={2.5} />
          {pending ? "처리 중..." : "정비소 추가"}
        </button>
      </form>

      {/* 목록 */}
      <div className="mt-3 space-y-2">
        {shops.length === 0 ? (
          <div className="rounded-[18px] border border-jb-line bg-jb-card px-[13px] py-7 text-center shadow-[var(--toss-shadow)]">
            <div className="text-[12.5px] font-bold text-jb-ink-soft">등록된 정비소가 없어요</div>
            <div className="mt-1 text-[11px] text-jb-ink-mute">
              위 폼으로 등록하면 라이더 화면에 바로 노출돼요
            </div>
          </div>
        ) : (
          shops.map((s) => (
            <div
              key={s.id}
              className="rounded-[18px] border border-jb-line bg-jb-card px-[13px] py-[11px] shadow-[var(--toss-shadow)]"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-black text-jb-ink">
                  {s.name}
                </span>
                <span
                  className={
                    s.is_active
                      ? "rounded-md bg-[#e5f6ed] px-1.5 py-0.5 text-[10.5px] font-bold text-[#0bb25f]"
                      : "rounded-md bg-jb-track px-1.5 py-0.5 text-[10.5px] font-bold text-jb-ink-mute"
                  }
                >
                  {s.is_active ? "노출 중" : "숨김"}
                </span>
              </div>
              <div className="mt-1.5 space-y-0.5 text-[11.5px] text-jb-ink-soft">
                {s.phone ? (
                  <div className="flex items-center gap-1">
                    <Phone size={11} strokeWidth={2} className="shrink-0 text-jb-ink-mute" />
                    <span className="tnum">{s.phone}</span>
                  </div>
                ) : null}
                {s.address ? (
                  <div className="flex items-center gap-1">
                    <MapPin size={11} strokeWidth={2} className="shrink-0 text-jb-ink-mute" />
                    <span className="truncate">{s.address}</span>
                  </div>
                ) : null}
                {s.note ? <div className="text-jb-ink-mute">{s.note}</div> : null}
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onToggle(s)}
                  className="flex-1 rounded-[12px] border border-jb-line bg-jb-card py-[7px] text-[11.5px] font-bold text-jb-ink-soft transition-transform active:scale-[.98] disabled:opacity-50"
                >
                  {s.is_active ? "숨기기" : "노출하기"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDelete(s)}
                  className="flex-1 rounded-[12px] border border-[#f5d2cf] bg-jb-red-tint py-[7px] text-[11.5px] font-bold text-jb-red transition-transform active:scale-[.98] disabled:opacity-50"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {toast ? (
        <ToastViewport>
          <Toast variant={toast.variant} message={toast.message} />
        </ToastViewport>
      ) : null}
    </>
  );
}
