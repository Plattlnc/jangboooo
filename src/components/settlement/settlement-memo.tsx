"use client";

import { useState, useCallback } from "react";
import { Save, Check } from "lucide-react";
import { saveSettlementMemo } from "@/actions/settlement-memo";

// 정산 기타 메모 — 자유 텍스트 노트. 저장 시 Storage 에 영속. Cmd/Ctrl+S 지원.
export function SettlementMemo({ initial }: { initial: string }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const dirty = content !== initial && !saved;

  const save = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    const res = await saveSettlementMemo(content);
    setSaving(false);
    if (res.ok) setSaved(true);
    else setError(res.message);
  }, [content]);

  return (
    <div className="rounded-[12px] border border-jb-line bg-jb-card p-5 shadow-[var(--toss-shadow)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-jb-ink">기타 메모</h2>
          <p className="mt-0.5 text-[12.5px] text-jb-ink-mute">정산 관련 메모를 자유롭게 기록하고 저장하세요. (정산팀 공용)</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && !dirty ? (
            <span className="flex items-center gap-1 text-[12px] font-medium text-jb-green">
              <Check size={14} /> 저장됨
            </span>
          ) : dirty ? (
            <span className="text-[12px] font-medium text-jb-orange">저장 안 됨</span>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={saving || (!dirty && saved) || content === initial}
            className="flex items-center gap-1.5 rounded-[10px] bg-jb-indigo px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Save size={15} />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
          setError(undefined);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            void save();
          }
        }}
        rows={20}
        placeholder="메모를 입력하세요…  (Cmd/Ctrl+S 로 저장)"
        className="w-full resize-y rounded-[10px] border border-jb-line bg-jb-surface px-3.5 py-3 text-[13.5px] leading-relaxed text-jb-ink outline-none focus:border-jb-indigo/50 placeholder:text-jb-ink-mute"
      />
      {error ? <p className="mt-2 text-[12.5px] font-medium text-jb-red">{error}</p> : null}
    </div>
  );
}
