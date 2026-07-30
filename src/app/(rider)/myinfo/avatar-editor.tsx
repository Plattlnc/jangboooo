"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { saveRiderAvatar, removeRiderAvatar } from "@/actions/profile";

// 프로필 사진 편집기 — 파일 선택 → 크롭 모달(드래그 이동 + 핀치/슬라이더 확대)
// → 512px 정방형 JPEG 로 캔버스 크롭 → 서버 액션 업로드.
// 미리보기 뷰포트(rounded-square) = 실제 노출 형태(WYSIWYG). 좌표계는 뷰포트 기준
// 이미지 좌상단 오프셋(tx,ty ≤ 0)과 배율(base cover × user 1~4)로 관리한다.

interface AvatarEditorProps {
  avatarUrl: string | null;
  initial: string;
}

const VIEW = 280; // 크롭 뷰포트 px (≥320px 화면 기준 모달 패딩 포함 안전)
const OUT = 512; // 결과 이미지 px
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface CropState {
  scale: number; // user zoom (1~4)
  tx: number;
  ty: number;
}

export function AvatarEditor({ avatarUrl, initial }: AvatarEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [src, setSrc] = useState<string | null>(null); // objectURL — 모달 열림 = src 존재
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ scale: 1, tx: 0, ty: 0 });
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // 활성 포인터(1개=팬, 2개=핀치). 리렌더 불필요한 제스처 중간값은 ref 로.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const baseScale = natural ? Math.max(VIEW / natural.w, VIEW / natural.h) : 1;
  const total = baseScale * crop.scale;

  /** 이미지가 뷰포트를 항상 덮도록 오프셋 클램프. */
  const clamp = useCallback(
    (tx: number, ty: number, scale: number): { tx: number; ty: number } => {
      if (!natural) return { tx, ty };
      const t = baseScale * scale;
      const w = natural.w * t;
      const h = natural.h * t;
      return {
        tx: Math.min(0, Math.max(VIEW - w, tx)),
        ty: Math.min(0, Math.max(VIEW - h, ty)),
      };
    },
    [natural, baseScale],
  );

  /** 앵커점(뷰포트 좌표) 고정 줌 — 핀치 중심/슬라이더(중앙) 공용. */
  const zoomAt = useCallback(
    (nextScale: number, anchorX: number, anchorY: number) => {
      setCrop((c) => {
        const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale));
        const factor = s / c.scale;
        const tx = anchorX - (anchorX - c.tx) * factor;
        const ty = anchorY - (anchorY - c.ty) * factor;
        return { scale: s, ...clamp(tx, ty, s) };
      });
    },
    [clamp],
  );

  const openPicker = () => {
    setError(null);
    fileRef.current?.click();
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("이미지 파일만 선택할 수 있어요.");
      return;
    }
    setNatural(null);
    setSrc(URL.createObjectURL(f));
  };

  const closeModal = useCallback(() => {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setNatural(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }, [src]);

  // Esc 닫기 (드로어와 동일 패턴).
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [src, closeModal]);

  const onImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    // cover 초기 배치 = 중앙 정렬.
    const t = Math.max(VIEW / w, VIEW / h);
    setNatural({ w, h });
    setCrop({ scale: 1, tx: (VIEW - w * t) / 2, ty: (VIEW - h * t) / 2 });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cur = { x: e.clientX, y: e.clientY };
    const pts = pointers.current;

    if (pts.size === 1) {
      // 팬
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      setCrop((c) => ({ ...c, ...clamp(c.tx + dx, c.ty + dy, c.scale) }));
    } else if (pts.size === 2) {
      // 핀치 — 고정된 반대쪽 포인터와의 거리비만큼, 두 점 중앙 앵커 줌
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)?.[1];
      if (other) {
        const distOld = Math.hypot(prev.x - other.x, prev.y - other.y);
        const distNew = Math.hypot(cur.x - other.x, cur.y - other.y);
        if (distOld > 0) {
          const midX = (cur.x + other.x) / 2 - rect.left;
          const midY = (cur.y + other.y) / 2 - rect.top;
          setCrop((c) => {
            const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.scale * (distNew / distOld)));
            const factor = s / c.scale;
            const tx = midX - (midX - c.tx) * factor;
            const ty = midY - (midY - c.ty) * factor;
            return { scale: s, ...clamp(tx, ty, s) };
          });
        }
      }
    }
    pts.set(e.pointerId, cur);
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
  };

  const apply = () => {
    const el = imgRef.current;
    if (!el || !natural) return;
    setError(null);
    // 뷰포트 → 원본 좌표 역산 후 정방형 크롭.
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("이 브라우저에서는 이미지 편집을 지원하지 않아요.");
      return;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(el, -crop.tx / total, -crop.ty / total, VIEW / total, VIEW / total, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("이미지 처리에 실패했어요. 다른 사진으로 시도해주세요.");
          return;
        }
        const fd = new FormData();
        fd.append("avatar", blob, "avatar.jpg");
        startTransition(async () => {
          const res = await saveRiderAvatar(fd);
          if (res.ok) {
            closeModal();
            router.refresh();
          } else {
            setError(res.message);
          }
        });
      },
      "image/jpeg",
      0.85,
    );
  };

  const remove = () => {
    setError(null);
    startTransition(async () => {
      const res = await removeRiderAvatar();
      if (res.ok) router.refresh();
      else setError(res.message);
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      {/* 아바타 + 카메라 배지 → 파일 선택 */}
      <button
        type="button"
        onClick={openPicker}
        disabled={pending}
        aria-label="프로필 사진 변경"
        className="relative block"
      >
        {avatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element -- 원격 도메인 미설정, 52px 고정 아바타라 next/image 이점 없음 */
          <img
            src={avatarUrl}
            alt="프로필 사진"
            className="size-[52px] rounded-2xl object-cover"
          />
        ) : (
          <span className="grid size-[52px] place-items-center rounded-2xl bg-white/20 text-[19px] font-black">
            {initial}
          </span>
        )}
        <span className="absolute -bottom-1 -right-1 grid size-[22px] place-items-center rounded-full bg-white text-jb-indigo shadow-[0_1px_4px_rgba(20,23,46,0.25)]">
          <Camera size={13} strokeWidth={2.4} />
        </span>
      </button>
      {avatarUrl ? (
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="flex items-center gap-0.5 text-[10.5px] font-semibold text-white/75 underline underline-offset-2"
        >
          <Trash2 size={10} strokeWidth={2.2} />
          삭제
        </button>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {/* 모달 밖(카드 위) 에러 — 삭제 실패 등 */}
      {error && !src ? (
        <span className="max-w-[90px] text-center text-[10px] leading-tight text-white/90">{error}</span>
      ) : null}

      {/* 크롭 모달 */}
      {src ? (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-scrim px-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="프로필 사진 조절"
            className="w-full max-w-[340px] rounded-2xl bg-white p-[18px] shadow-lg"
          >
            <div className="text-[15px] font-black text-jb-ink">프로필 사진 조절</div>
            <p className="mt-0.5 text-[11.5px] text-jb-ink-mute">
              드래그로 위치를, 손가락 벌리기나 슬라이더로 크기를 맞춰주세요.
            </p>

            {/* 뷰포트 = 실제 노출 영역(WYSIWYG) */}
            <div className="mt-3.5 flex justify-center">
              <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                className="relative overflow-hidden rounded-[28px] bg-[#f0f1f5]"
                style={{ width: VIEW, height: VIEW, touchAction: "none" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- objectURL 크롭 캔버스 소스 */}
                <img
                  ref={imgRef}
                  src={src}
                  alt=""
                  draggable={false}
                  onLoad={onImgLoad}
                  className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
                  style={
                    natural
                      ? {
                          width: natural.w * total,
                          height: natural.h * total,
                          transform: `translate3d(${crop.tx}px, ${crop.ty}px, 0)`,
                        }
                      : { opacity: 0 }
                  }
                />
              </div>
            </div>

            {/* 줌 슬라이더 — 뷰포트 중앙 앵커 */}
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.scale}
              onChange={(e) => zoomAt(Number(e.target.value), VIEW / 2, VIEW / 2)}
              disabled={!natural}
              aria-label="확대/축소"
              className="mt-3.5 w-full accent-jb-indigo"
            />

            {error ? <p className="mt-2 text-center text-[12px] font-semibold text-[#e03131]">{error}</p> : null}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="flex-1 rounded-[11px] border border-jb-line bg-white py-[11px] text-[13px] font-semibold text-jb-ink-mute"
              >
                취소
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={pending || !natural}
                className={cn(
                  "flex-1 rounded-[11px] bg-jb-indigo py-[11px] text-[13px] font-bold text-white transition-transform active:scale-[.98]",
                  (pending || !natural) && "opacity-60",
                )}
              >
                {pending ? "저장 중…" : "적용"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
