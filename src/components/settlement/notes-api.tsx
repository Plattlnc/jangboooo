"use client";

import { useCallback, useMemo, useState } from "react";
import { Save, Check } from "lucide-react";
import { saveRiderNotes, saveRiderMemos, saveRiderRrns } from "@/actions/settlement-notes";

// 라이더별 특이사항·메모(·주민번호) 공유 상태 — 여러 탭이 동일 데이터를 편집/저장.
// rrns 는 라이더 설정 페이지에서만 초기화(다른 탭은 undefined → 저장 대상 아님).
export interface NotesApi {
  notes: Record<string, string>;
  setNote: (id: string, val: string) => void;
  memos: Record<string, string>;
  setMemo: (id: string, val: string) => void;
  rrns?: Record<string, string>;
  setRrn?: (id: string, val: string) => void;
  save: () => void; // 특이사항+메모(+주민번호) 함께 저장
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

/** 초기 맵으로 공유 특이사항·메모(·주민번호) 상태 생성(상위에서 1회 호출). */
export function useRiderNotesApi(
  initialNotes: Record<string, string>,
  initialMemos: Record<string, string> = {},
  initialRrns?: Record<string, string>,
): NotesApi {
  const hasRrn = initialRrns !== undefined;
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [memos, setMemos] = useState<Record<string, string>>(initialMemos);
  const [rrns, setRrns] = useState<Record<string, string>>(initialRrns ?? {});
  // 마지막 저장 스냅샷(저장 성공 시 갱신) — dirty 판정 기준. 마운트 prop 이 아니라 이걸로 비교해야
  // 저장 직후 "저장됨"이 정확히 표시된다.
  const [baseNotes, setBaseNotes] = useState<Record<string, string>>(initialNotes);
  const [baseMemos, setBaseMemos] = useState<Record<string, string>>(initialMemos);
  const [baseRrns, setBaseRrns] = useState<Record<string, string>>(initialRrns ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();

  const dirty = useMemo(
    () => dirtyDiff(notes, baseNotes) || dirtyDiff(memos, baseMemos) || (hasRrn && dirtyDiff(rrns, baseRrns)),
    [notes, baseNotes, memos, baseMemos, rrns, baseRrns, hasRrn],
  );

  const setNote = useCallback((id: string, val: string) => {
    setNotes((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
    setError(undefined);
  }, []);

  const setMemo = useCallback((id: string, val: string) => {
    setMemos((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
    setError(undefined);
  }, []);

  const setRrn = useCallback((id: string, val: string) => {
    setRrns((prev) => ({ ...prev, [id]: val }));
    setSaved(false);
    setError(undefined);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(undefined);
    const noteSnap = notes;
    const memoSnap = memos;
    const rrnSnap = rrns;
    const jobs = [saveRiderNotes(noteSnap), saveRiderMemos(memoSnap)];
    if (hasRrn) jobs.push(saveRiderRrns(rrnSnap));
    const results = await Promise.all(jobs);
    setSaving(false);
    const failed = results.find((r) => !r.ok);
    if (!failed) {
      setBaseNotes(noteSnap);
      setBaseMemos(memoSnap);
      if (hasRrn) setBaseRrns(rrnSnap);
      setSaved(true);
    } else {
      setError(failed.ok ? "저장 실패" : failed.message);
    }
  }, [notes, memos, rrns, hasRrn]);

  return {
    notes,
    setNote,
    memos,
    setMemo,
    ...(hasRrn ? { rrns, setRrn } : {}),
    save,
    saving,
    saved,
    dirty,
    error,
  };
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
        {api.saving ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
