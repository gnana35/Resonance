"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code2,
  Indent,
  Italic,
  List,
  ListOrdered,
  Outdent,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

const BLOCK_OPTIONS = [
  { label: "Paragraph", tag: "p" },
  { label: "Heading 1", tag: "h1" },
  { label: "Heading 2", tag: "h2" },
  { label: "Quote", tag: "blockquote" },
];

const LINE_SPACING_OPTIONS = [
  { label: "Single", value: "1" },
  { label: "1.5×", value: "1.5" },
  { label: "Double", value: "2" },
  { label: "2.5×", value: "2.5" },
];

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function DocumentEditor({ initialHtml }: { initialHtml: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blockLabel, setBlockLabel] = useState("Paragraph");
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [spacingMenuOpen, setSpacingMenuOpen] = useState(false);
  const [spacingLabel, setSpacingLabel] = useState("1.5×");
  const [wordCount, setWordCount] = useState(() => countWords(initialHtml));
  const [charCount, setCharCount] = useState(() => initialHtml.length);

  // Set the editor's starting content once, imperatively.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
      updateCounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateCounts() {
    const text = editorRef.current?.innerText ?? "";
    setWordCount(countWords(text));
    setCharCount(text.trim().length);
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    updateCounts();
  }

  function applyBlock(tag: string, label: string) {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    setBlockLabel(label);
    setBlockMenuOpen(false);
  }

  function applySpacing(value: string, label: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    // Apply line-height to every block element in selection, or editor root
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const container =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? (range.commonAncestorContainer.parentElement as HTMLElement)
          : (range.commonAncestorContainer as HTMLElement);
      // Walk up to a block-level ancestor inside the editor
      let block: HTMLElement | null = container;
      while (block && block !== editor && block.parentElement !== editor) {
        block = block.parentElement;
      }
      if (block && block !== editor) {
        block.style.lineHeight = value;
      } else {
        editor.style.lineHeight = value;
      }
    } else {
      editor.style.lineHeight = value;
    }
    setSpacingLabel(label);
    setSpacingMenuOpen(false);
  }

  function insertCode() {
    const selection = window.getSelection();
    const text = selection?.toString();
    if (text) {
      exec("insertHTML", `<code>${text}</code>`);
    }
  }

  return (
    <div className="flex flex-col">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gold-3/20 px-4 py-2">

        {/* Block format */}
        <div className="relative">
          <button
            onClick={() => { setBlockMenuOpen((v) => !v); setSpacingMenuOpen(false); }}
            className="flex items-center gap-1.5 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
          >
            {blockLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {blockMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-36 rounded-md border border-gold-3/30 bg-bg-1 py-1 shadow-lg">
              {BLOCK_OPTIONS.map((opt) => (
                <button
                  key={opt.tag}
                  onClick={() => applyBlock(opt.tag, opt.label)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-gold-2/10"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Sep />

        {/* Text formatting */}
        <TB onClick={() => exec("bold")} label="Bold"><Bold className="h-4 w-4" /></TB>
        <TB onClick={() => exec("italic")} label="Italic"><Italic className="h-4 w-4" /></TB>
        <TB onClick={() => exec("underline")} label="Underline"><Underline className="h-4 w-4" /></TB>
        <TB onClick={() => exec("strikeThrough")} label="Strikethrough"><Strikethrough className="h-4 w-4" /></TB>
        <TB onClick={insertCode} label="Inline code"><Code2 className="h-4 w-4" /></TB>

        <Sep />

        {/* Alignment */}
        <TB onClick={() => exec("justifyLeft")} label="Align left"><AlignLeft className="h-4 w-4" /></TB>
        <TB onClick={() => exec("justifyCenter")} label="Align center"><AlignCenter className="h-4 w-4" /></TB>
        <TB onClick={() => exec("justifyRight")} label="Align right"><AlignRight className="h-4 w-4" /></TB>
        <TB onClick={() => exec("justifyFull")} label="Justify"><AlignJustify className="h-4 w-4" /></TB>

        <Sep />

        {/* Lists */}
        <TB onClick={() => exec("insertUnorderedList")} label="Bullet list"><List className="h-4 w-4" /></TB>
        <TB onClick={() => exec("insertOrderedList")} label="Numbered list"><ListOrdered className="h-4 w-4" /></TB>

        <Sep />

        {/* Indent / Outdent */}
        <TB onClick={() => exec("indent")} label="Indent"><Indent className="h-4 w-4" /></TB>
        <TB onClick={() => exec("outdent")} label="Outdent"><Outdent className="h-4 w-4" /></TB>

        <Sep />

        {/* Line spacing */}
        <div className="relative">
          <button
            onClick={() => { setSpacingMenuOpen((v) => !v); setBlockMenuOpen(false); }}
            className="flex items-center gap-1.5 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
            title="Line spacing"
          >
            {spacingLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {spacingMenuOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 w-28 rounded-md border border-gold-3/30 bg-bg-1 py-1 shadow-lg">
              {LINE_SPACING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => applySpacing(opt.value, opt.label)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-gold-2/10"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo pushed to end */}
        <div className="ml-auto flex items-center gap-1">
          <TB onClick={() => exec("undo")} label="Undo"><Undo2 className="h-4 w-4" /></TB>
          <TB onClick={() => exec("redo")} label="Redo"><Redo2 className="h-4 w-4" /></TB>
        </div>
      </div>

      {/* ── Editor area ─────────────────────────────────────────────── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={updateCounts}
        className={[
          "min-h-[420px] px-6 py-6 text-ink/90 leading-[1.5] focus:outline-none",
          "[&_h1]:font-display [&_h1]:text-3xl [&_h1]:text-gold-1 [&_h1]:mb-3",
          "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-gold-1 [&_h2]:mb-2",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-gold-3/50 [&_blockquote]:pl-4 [&_blockquote]:italic",
          "[&_p]:mb-4",
          "[&_code]:rounded [&_code]:bg-bg-0 [&_code]:px-1.5 [&_code]:py-0.5",
          // Bullet list styling
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul_li]:mb-1",
          // Numbered list styling
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol_li]:mb-1",
          // Nested indent levels
          "[&_ul_ul]:list-[circle] [&_ul_ul]:mt-1",
          "[&_ol_ol]:list-[lower-alpha] [&_ol_ol]:mt-1",
        ].join(" ")}
      />

      {/* ── Status bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-gold-3/20 px-6 py-3 text-sm text-ink/60">
        <span>
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()} characters
        </span>
        <span>Chapter 3</span>
      </div>
    </div>
  );
}

/** Thin vertical separator */
function Sep() {
  return <div className="mx-1 h-5 w-px bg-gold-3/20" />;
}

/** Toolbar button */
function TB({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-ink/70 hover:bg-gold-2/10 hover:text-gold-1"
    >
      {children}
    </button>
  );
}
