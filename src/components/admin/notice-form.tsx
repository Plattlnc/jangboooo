"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NoticeEditor } from "./notice-editor";
import { saveNotice, deleteNotice } from "@/actions/notices";
import type { NoticeRow } from "@/types/database";

const FLAGS = [
  { key: "pub", label: "게시(라이더 노출)", hint: "끄면 초안으로 저장" },
  { key: "pin", label: "상단 고정", hint: "목록 맨 위로" },
  { key: "imp", label: "중요 배지", hint: "빨간 '중요' 표시" },
  { key: "feat", label: "메인 홈 노출", hint: "홈 배너에 제목 강조" },
] as const;

export function NoticeForm({ initial }: { initial: NoticeRow | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [flags, setFlags] = useState({
    pub: initial?.is_published ?? false,
    pin: initial?.is_pinned ?? false,
    imp: initial?.is_important ?? false,
    feat: initial?.is_featured ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr("제목을 입력해주세요.");
    setSaving(true);
    const res = await saveNotice({
      id: initial?.id,
      title,
      excerpt,
      body,
      is_published: flags.pub,
      is_pinned: flags.pin,
      is_important: flags.imp,
      is_featured: flags.feat,
    });
    setSaving(false);
    if (res.ok) router.push("/admin/notices");
    else setErr(res.message);
  };

  const remove = async () => {
    if (!initial?.id) return;
    if (!window.confirm("이 공지를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setSaving(true);
    const res = await deleteNotice(initial.id);
    setSaving(false);
    if (res.ok) router.push("/admin/notices");
    else setErr(res.message);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <label className="mb-1 block text-[12px] font-bold text-jb-ink-mute">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="공지 제목"
          maxLength={120}
          className="w-full rounded-[12px] border border-jb-line bg-white px-3.5 py-2.5 text-[14px] font-bold text-jb-ink outline-none focus:border-jb-indigo"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-bold text-jb-ink-mute">
          요약 <span className="font-medium text-jb-ink-mute/70">(선택 · 홈 배너/목록 미리보기, 비우면 본문에서 자동)</span>
        </label>
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="한 줄 요약"
          maxLength={200}
          className="w-full rounded-[12px] border border-jb-line bg-white px-3.5 py-2.5 text-[13px] text-jb-ink outline-none focus:border-jb-indigo"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12px] font-bold text-jb-ink-mute">본문</label>
        <NoticeEditor value={initial?.body ?? ""} onChange={setBody} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FLAGS.map((f) => {
          const on = flags[f.key];
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFlags((s) => ({ ...s, [f.key]: !s[f.key] }))}
              className={
                "flex items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition-colors " +
                (on ? "border-jb-indigo bg-jb-indigo-tint" : "border-jb-line bg-white")
              }
            >
              <span
                className={
                  "grid size-5 shrink-0 place-items-center rounded-[6px] text-[11px] font-black text-white " +
                  (on ? "bg-jb-indigo" : "bg-jb-track")
                }
              >
                {on ? "✓" : ""}
              </span>
              <span className="min-w-0">
                <span className={"block text-[12.5px] font-bold " + (on ? "text-jb-indigo" : "text-jb-ink")}>{f.label}</span>
                <span className="block text-[10.5px] text-jb-ink-mute">{f.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {err ? <p className="text-[12.5px] font-semibold text-jb-red">{err}</p> : null}

      <div className="flex gap-2 pt-1">
        {initial?.id ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="rounded-[12px] border border-jb-line bg-white px-4 py-2.5 text-[13px] font-bold text-jb-red disabled:opacity-50"
          >
            삭제
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => router.push("/admin/notices")}
          disabled={saving}
          className="ml-auto rounded-[12px] border border-jb-line bg-white px-4 py-2.5 text-[13px] font-bold text-jb-ink-mute disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-[12px] bg-jb-indigo px-5 py-2.5 text-[13px] font-black text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "저장 중…" : initial?.id ? "수정" : "등록"}
        </button>
      </div>
    </div>
  );
}
