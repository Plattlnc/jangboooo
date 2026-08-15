"use client";

import { useMemo, useState, memo } from "react";
import { Search } from "lucide-react";
import type { SettlementRider } from "@/app/settlement/_lib/notes";
import { NotesSaveButton, type NotesApi } from "./notes-api";

// 라이더별 메모·특이사항(·주민번호) — 상위 공유 상태(NotesApi) 소비. 검색 + 인라인 입력 + 저장.
// api.rrns 가 있으면(라이더 설정 페이지) 주민등록번호 컬럼을 함께 노출/편집.
// 라이더 ID·이름에 귀속돼 한 번 저장하면 날짜가 바뀌어도 유지(모든 탭 공유 데이터).
export function RiderNotes({
  api,
  riders,
  heading = "라이더별 메모·특이사항",
  subtitle = "라이더 ID·이름에 귀속돼 날짜가 바뀌어도 유지됩니다",
}: {
  api: NotesApi;
  riders: SettlementRider[];
  heading?: string;
  subtitle?: string;
}) {
  const { notes, setNote, memos, setMemo, rrns, setRrn } = api;
  const showRrn = rrns !== undefined && setRrn !== undefined;
  const [q, setQ] = useState("");
  const [onlyNoted, setOnlyNoted] = useState(false);

  const hasEntry = (id: string) =>
    Boolean((memos[id] ?? "").trim() || (notes[id] ?? "").trim() || (rrns?.[id] ?? "").trim());

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return riders.filter((r) => {
      if (onlyNoted && !hasEntry(r.id)) return false;
      if (!needle) return true;
      return r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riders, q, onlyNoted, notes, memos, rrns]);

  const notedCount = useMemo(
    () => riders.reduce((n, r) => n + (hasEntry(r.id) ? 1 : 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [riders, notes, memos, rrns],
  );

  const colCount = showRrn ? 6 : 5;

  return (
    <div className="overflow-hidden rounded-[12px] border border-jb-line bg-jb-card shadow-[var(--toss-shadow)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jb-line px-4 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-jb-ink">{heading}</h2>
          <p className="mt-0.5 text-[12.5px] text-jb-ink-mute">{subtitle} · 기록 {notedCount}명</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="flex shrink-0 items-center gap-1.5 text-[12.5px] text-jb-ink-soft">
            <input type="checkbox" checked={onlyNoted} onChange={(e) => setOnlyNoted(e.target.checked)} className="accent-jb-indigo" />
            <span className="hidden sm:inline">기록된 라이더만</span>
            <span className="sm:hidden">기록만</span>
          </label>
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] border border-jb-line bg-jb-surface px-2.5 py-1.5 sm:flex-none">
            <Search size={15} className="shrink-0 text-jb-ink-mute" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름·ID 검색"
              className="w-full min-w-0 bg-transparent text-[13px] text-jb-ink outline-none placeholder:text-jb-ink-mute sm:w-[130px]"
            />
          </div>
          <NotesSaveButton api={api} />
        </div>
      </div>

      {api.error ? <p className="border-b border-jb-line px-4 py-2 text-[12.5px] font-medium text-jb-red">{api.error}</p> : null}

      <div className="max-h-[calc(100dvh-320px)] overflow-auto">
        <table className="w-full whitespace-nowrap border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-jb-surface text-[12px] font-medium text-jb-ink-mute">
            <tr>
              <th className="border-b border-jb-line px-2 py-2.5 text-right">#</th>
              <th className="min-w-[96px] border-b border-jb-line px-4 py-2.5 text-left">라이더</th>
              <th className="w-[240px] min-w-[240px] border-b border-jb-line px-3 py-2.5 text-left">메모</th>
              <th className="border-b border-jb-line px-3 py-2.5 text-left">라이더 ID</th>
              {showRrn ? <th className="w-[190px] border-b border-jb-line px-3 py-2.5 text-left">주민등록번호</th> : null}
              <th className="w-full min-w-[240px] border-b border-jb-line px-3 py-2.5 text-left">특이사항</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <NoteRow
                key={r.id}
                index={i + 1}
                id={r.id}
                name={r.name}
                memoValue={memos[r.id] ?? ""}
                noteValue={notes[r.id] ?? ""}
                rrnValue={showRrn ? rrns[r.id] ?? "" : undefined}
                onMemo={setMemo}
                onNote={setNote}
                onRrn={showRrn ? setRrn : undefined}
              />
            ))}
            {view.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-[13px] text-jb-ink-mute">
                  해당하는 라이더가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const NoteRow = memo(function NoteRow({
  index,
  id,
  name,
  memoValue,
  noteValue,
  rrnValue,
  onMemo,
  onNote,
  onRrn,
}: {
  index: number;
  id: string;
  name: string;
  memoValue: string;
  noteValue: string;
  rrnValue?: string;
  onMemo: (id: string, val: string) => void;
  onNote: (id: string, val: string) => void;
  onRrn?: (id: string, val: string) => void;
}) {
  const cell =
    "w-full rounded-[8px] border border-transparent bg-transparent px-2 py-1.5 text-[13px] text-jb-ink outline-none hover:border-jb-line focus:border-jb-indigo/50 focus:bg-jb-surface placeholder:text-jb-ink-mute";
  return (
    <tr className="border-b border-jb-line-soft">
      <td className="px-3 py-1.5 text-right font-mono text-[12px] tabular-nums text-jb-ink-mute">{index}</td>
      <td className="whitespace-nowrap px-4 py-1.5 font-medium text-jb-ink">{name}</td>
      <td className="px-3 py-1.5">
        <input value={memoValue} onChange={(e) => onMemo(id, e.target.value)} placeholder="메모 입력…" className={cell} />
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[12px] text-jb-ink-mute">{id}</td>
      {onRrn ? (
        <td className="px-3 py-1.5">
          <input
            value={rrnValue ?? ""}
            onChange={(e) => onRrn(id, e.target.value)}
            placeholder="예) 900101-1234567"
            inputMode="numeric"
            autoComplete="off"
            className={`${cell} font-mono`}
          />
        </td>
      ) : null}
      <td className="px-3 py-1.5">
        <input value={noteValue} onChange={(e) => onNote(id, e.target.value)} placeholder="특이사항 입력…" className={cell} />
      </td>
    </tr>
  );
});
