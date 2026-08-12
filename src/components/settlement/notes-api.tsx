"use client";

import { useCallback, useMemo, useState } from "react";
import { Save, Check } from "lucide-react";
import { saveRiderNotes } from "@/actions/settlement-notes";

// 라이더별 특이사항 공유 상태 — 정산 내역 탭·기타 탭이 동일 데이터를 편집/저장.
export interface NotesApi {
  notes: Record<string, string>;
  setNote: (id: string, val: string) => void;
  save: () => void;
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  error?: string;
}

function dirtyDiff(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? "").trim() !== (b[k] ?? "").trim()) return true;
  return false;
}

/** 초기 맵으로 공유 특이사항 상태 생성(상위에서 1회 호출, 양 탭에 전달). */
export function useRiderNotesApi(initial: Record<string, string>): NotesApi {
  const [notes, setNotes] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const dirty = useMemo(() => dirtyDiff(notes, initial), [notes, initial]);

  const setNote = useCallback((id: string, val: string) => {
    setNotes((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
    setError(undefined);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    const res = await saveRiderNotes(notes);
    setSaving(false);
    if (res.ok) setSaved(true);
    else setError(res.message);
  }, [notes]);

  return { notes, setNote, save, saving, saved, dirty, error };
}

/** 공유 저장 버튼(+미저장/저장됨 상태) — 어느 탭에서 눌러도 전체 저장. */
export function NotesSaveButton({ api }: { api: NotesApi }) {
  return (
    <div className="flex items-center gap-2">
      {api.saved && !api.dirty ? (
        <span className="flex items-center gap-1 text-[12px] font-medium text-jb-green">
          <Check size={14} /> 저장됨
        </span>
      ) : api.dirty ? (
        <span className="text-[12px] font-medium text-jb-orange">저장 안 됨</span>
      ) : null}
      <button
        type="button"
        onClick={api.save}
        disabled={api.saving || !api.dirty}
        className="flex items-center gap-1.5 rounded-[10px] bg-jb-indigo px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Save size={15} />
        {api.saving ? "저장 중…" : "특이사항 저장"}
      </button>
    </div>
  );
}
