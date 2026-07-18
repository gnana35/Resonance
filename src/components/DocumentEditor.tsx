"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  ChevronDown,
  Code2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
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

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

export function DocumentEditor({ initialHtml }: { initialHtml: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [blockLabel, setBlockLabel] = useState("Paragraph");
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [wordCount, setWordCount] = useState(() => countWords(initialHtml));
  const [charCount, setCharCount] = useState(() => initialHtml.length);

  // Set the editor's starting content once, imperatively. Never re-apply
  // from React state/props afterward — doing so on every keystroke-driven
  // re-render fights the browser's own DOM mutations mid-edit and makes
  // typed text vanish.
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

  function insertLink() {
    const url = window.prompt("Link URL");
    if (url) exec("createLink", url);
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
      <div className="flex flex-wrap items-center gap-1 border-b border-gold-3/20 px-6 py-3">
        <div className="relative">
          <button
            onClick={() => setBlockMenuOpen((v) => !v)}
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

        <div className="mx-2 h-5 w-px bg-gold-3/20" />

        <ToolbarButton onClick={() => exec("bold")} label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("italic")} label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec("underline")} label="Underline">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("strikeThrough")}
          label="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={insertCode} label="Inline code">
          <Code2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-2 h-5 w-px bg-gold-3/20" />

        <ToolbarButton onClick={insertLink} label="Insert link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            const url = window.prompt("Image URL");
            if (url) exec("insertImage", url);
          }}
          label="Insert image"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("insertUnorderedList")}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => exec("insertOrderedList")}
          label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={() => exec("undo")} label="Undo">
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("redo")} label="Redo">
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={updateCounts}
        className="min-h-[420px] px-6 py-6 text-ink/90 leading-relaxed focus:outline-none [&_h1]:font-display [&_h1]:text-3xl [&_h1]:text-gold-1 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-gold-1 [&_blockquote]:border-l-2 [&_blockquote]:border-gold-3/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_p]:mb-4 [&_code]:rounded [&_code]:bg-bg-0 [&_code]:px-1.5 [&_code]:py-0.5"
      />

      <div className="flex items-center justify-between border-t border-gold-3/20 px-6 py-3 text-sm text-ink/60">
        <span>
          {wordCount.toLocaleString()} words · {charCount.toLocaleString()}{" "}
          characters
        </span>
        <span>Chapter 3</span>
      </div>
    </div>
  );
}

function ToolbarButton({
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
      className="rounded-md p-2 text-ink/70 hover:bg-gold-2/10 hover:text-gold-1"
    >
      {children}
    </button>
  );
}
