"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Image } from "@tiptap/extension-image";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Heading2, Heading3, Link2, ImageIcon, Baseline, RemoveFormatting,
} from "lucide-react";
import { uploadNoticeImage } from "@/actions/notices";

// 공지 리치 텍스트 에디터 — Tiptap. 굵기/기울임/밑줄/취소선·제목·목록·링크·색상·이미지.
// value(HTML) 초기화, 변경 시 onChange(HTML). 저장 시 서버에서 sanitize.
const COLORS = ["#191F28", "#F04452", "#F28A00", "#0BB25F", "#3182F6", "#7C5CFF"];

function Btn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={
        "grid size-8 place-items-center rounded-[12px] text-jb-ink transition-colors disabled:opacity-40 " +
        (active ? "bg-jb-indigo-tint text-jb-indigo" : "hover:bg-jb-line-soft")
      }
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await uploadNoticeImage(fd);
      if (res.ok && res.url) editor.chain().focus().setImage({ src: res.url }).run();
      else alert(res.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setLink = () => {
    const prev = (editor.getAttributes("link").href as string) ?? "https://";
    const url = window.prompt("링크 URL을 입력하세요", prev);
    if (url === null) return;
    if (url.trim() === "") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-jb-line bg-jb-surface px-1.5 py-1">
      <Btn title="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="밑줄" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <Underline size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={16} strokeWidth={2.4} />
      </Btn>

      <span className="mx-0.5 h-5 w-px bg-jb-line" />

      <Btn title="제목" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="소제목" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="글머리 목록" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} strokeWidth={2.4} />
      </Btn>
      <Btn title="번호 목록" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={16} strokeWidth={2.4} />
      </Btn>

      <span className="mx-0.5 h-5 w-px bg-jb-line" />

      <Btn title="링크" active={editor.isActive("link")} onClick={setLink}>
        <Link2 size={16} strokeWidth={2.4} />
      </Btn>

      {/* 색상 */}
      <div className="relative">
        <Btn title="글자 색" active={colorOpen} onClick={() => setColorOpen((v) => !v)}>
          <Baseline size={16} strokeWidth={2.4} />
        </Btn>
        {colorOpen ? (
          <div className="absolute left-0 top-9 z-10 flex gap-1 rounded-[10px] border border-jb-line bg-jb-card p-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { editor.chain().focus().setColor(c).run(); setColorOpen(false); }}
                className="size-5 rounded-full ring-1 ring-black/10"
                style={{ background: c }}
                aria-label={`색상 ${c}`}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().unsetColor().run(); setColorOpen(false); }}
              className="grid size-5 place-items-center rounded-full text-[9px] font-bold text-jb-ink-mute ring-1 ring-jb-line"
              title="색 없음"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>

      <Btn title="이미지" disabled={uploading} onClick={() => fileRef.current?.click()}>
        <ImageIcon size={16} strokeWidth={2.2} />
      </Btn>

      <span className="mx-0.5 h-5 w-px bg-jb-line" />

      <Btn title="서식 지우기" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <RemoveFormatting size={16} strokeWidth={2.2} />
      </Btn>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pickImage(e.target.files?.[0])}
      />
      {uploading ? <span className="ml-1 text-[11px] text-jb-ink-mute">업로드 중…</span> : null}
    </div>
  );
}

export function NoticeEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded-lg" } }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "notice-prose min-h-[240px] px-3.5 py-3" },
    },
  });

  return (
    <div className="overflow-hidden rounded-[18px] border border-jb-line bg-jb-card">
      {editor ? <Toolbar editor={editor} /> : null}
      <EditorContent editor={editor} />
    </div>
  );
}
