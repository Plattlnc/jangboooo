import sanitizeHtml from "sanitize-html";

// 공지 본문(Tiptap 리치 텍스트 HTML) 정화 — 작성 시 서버에서 1회 적용해 안전한 HTML만 저장.
// 허용: 서식(굵게/기울임/밑줄/취소선)·목록·제목·인용·링크·이미지·색상 span. 스크립트/이벤트 제거.
const COLOR = [/^#(0x)?[0-9a-f]{3,8}$/i, /^rgba?\(/i, /^[a-z]+$/i];

export function sanitizeNoticeHtml(dirty: string): string {
  return sanitizeHtml(dirty ?? "", {
    allowedTags: [
      "p", "br", "hr",
      "strong", "b", "em", "i", "u", "s", "del", "mark",
      "ul", "ol", "li",
      "h1", "h2", "h3",
      "blockquote", "code", "pre",
      "a", "img", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["style"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      li: ["style"],
    },
    allowedStyles: {
      "*": {
        color: COLOR,
        "background-color": COLOR,
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https"] }, // Supabase Storage 공개 URL(https)
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

/** HTML → 순수 텍스트(요약/미리보기용). 태그 제거 후 공백 정리. */
export function noticePlainText(html: string): string {
  return sanitizeHtml(html ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
