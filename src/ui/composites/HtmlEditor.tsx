"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { sanitizeRichText } from "@/src/lib/utils/html";
import { useField } from "@/src/ui/primitives/Field";

export interface HtmlEditorProps {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "removeFormat"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight"
  | "undo"
  | "redo"
  | "foreColor";

type HeadingValue = "p" | "h1" | "h2" | "h3";
type AlignValue = "left" | "center" | "right";

const COLORS: Array<{ value: string; label: string; hex: string }> = [
  { value: "slate", label: "Gri", hex: "#475569" },
  { value: "rose", label: "Kırmızı", hex: "#e11d48" },
  { value: "orange", label: "Turuncu", hex: "#ea580c" },
  { value: "amber", label: "Sarı", hex: "#d97706" },
  { value: "emerald", label: "Yeşil", hex: "#059669" },
  { value: "sky", label: "Mavi", hex: "#0284c7" },
  { value: "violet", label: "Mor", hex: "#7c3aed" },
];

function normalize(html: string) {
  const trimmed = (html ?? "").trim();
  if (!trimmed || trimmed === "<br>" || trimmed === "<div><br></div>" || trimmed === "<p><br></p>") return "";
  return sanitizeRichText(trimmed);
}

function execCmd(command: Command) {
  document.execCommand(command);
}

function execWithValue(command: Command, value: string) {
  document.execCommand(command, false, value);
}

function isSelectionInside(el: HTMLElement, sel: Selection | null) {
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const node =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;
  return !!node && el.contains(node);
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      {children}
    </svg>
  );
}

function ToolbarBtn({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "border-primary bg-primary-50 text-primary" : "border-border bg-surface text-fg-muted hover:bg-bg hover:text-fg",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

export function HtmlEditor({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  className,
  minHeight = "min-h-[140px]",
}: HtmlEditorProps) {
  const field = useField();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastValueRef = useRef(normalize(value));
  const didInitRef = useRef(false);
  const selectionRef = useRef<Range | null>(null);
  const prevShowHtmlRef = useRef(false);
  const [showHtml, setShowHtml] = useState(false);
  const [headingValue, setHeadingValue] = useState<HeadingValue>("p");
  const [alignValue, setAlignValue] = useState<AlignValue>("left");

  const inputId = id ?? field?.id;
  const isEmpty = normalize(value).length === 0;

  const setEditorHtml = useCallback((html: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = html || "";
  }, []);

  const restoreSelection = useCallback(() => {
    const el = editorRef.current;
    const range = selectionRef.current;
    if (!el || !range) return;
    el.focus();
    const sel = document.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  useLayoutEffect(() => {
    if (didInitRef.current || showHtml) return;
    didInitRef.current = true;
    const next = normalize(value);
    setEditorHtml(next);
    lastValueRef.current = next;
  }, [setEditorHtml, showHtml, value]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = normalize(value);
    if (next === lastValueRef.current) return;
    if (document.activeElement !== el && !showHtml) {
      setEditorHtml(next);
      lastValueRef.current = next;
    }
  }, [setEditorHtml, showHtml, value]);

  useEffect(() => {
    const prev = prevShowHtmlRef.current;
    prevShowHtmlRef.current = showHtml;
    if (!(prev === true && showHtml === false)) return;
    const next = normalize(value);
    requestAnimationFrame(() => {
      setEditorHtml(next);
      lastValueRef.current = next;
    });
  }, [setEditorHtml, showHtml, value]);

  useEffect(() => {
    if (showHtml) return;
    const el = editorRef.current;
    if (!el) return;
    const handler = () => {
      const sel = document.getSelection();
      if (!isSelectionInside(el, sel) || !sel || sel.rangeCount === 0) return;
      selectionRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [showHtml]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = normalize(el.innerHTML);
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const run = (command: Command) => {
    if (disabled || showHtml) return;
    restoreSelection();
    execCmd(command);
    emit();
  };

  const handleHeading = (tag: HeadingValue) => {
    if (disabled || showHtml) return;
    setHeadingValue(tag);
    restoreSelection();
    document.execCommand("formatBlock", false, tag === "p" ? "P" : tag.toUpperCase());
    emit();
  };

  const handleAlign = (align: AlignValue) => {
    if (disabled || showHtml) return;
    setAlignValue(align);
    restoreSelection();
    execCmd(align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight");
    emit();
  };

  const handleColor = (color: string) => {
    if (disabled || showHtml) return;
    restoreSelection();
    if (color === "default") execCmd("removeFormat");
    else execWithValue("foreColor", COLORS.find((c) => c.value === color)?.hex ?? "#475569");
    emit();
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const clean = html
      ? sanitizeRichText(html)
      : text.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char).replace(/\n/g, "<br>");
    restoreSelection();
    document.execCommand("insertHTML", false, clean);
    emit();
  };

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border border-border bg-surface",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "opacity-60",
        )}
      >
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-bg px-1.5 py-1.5">
          <select
            aria-label="Başlık"
            title="Başlık"
            disabled={disabled || showHtml}
            value={headingValue}
            onChange={(e) => handleHeading(e.target.value as HeadingValue)}
            className="h-11 rounded-md border border-border bg-surface px-2 text-[13px] text-fg disabled:opacity-40"
          >
            <option value="p">Normal</option>
            <option value="h1">Başlık 1</option>
            <option value="h2">Başlık 2</option>
            <option value="h3">Başlık 3</option>
          </select>
          <ToolbarBtn title="Kalın" disabled={disabled || showHtml} onClick={() => run("bold")}>
            <Icon><path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="İtalik" disabled={disabled || showHtml} onClick={() => run("italic")}>
            <Icon><path d="M15 5H9M14 19H8M14 5l-4 14" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Altı çizili" disabled={disabled || showHtml} onClick={() => run("underline")}>
            <Icon><path d="M7 5v6a5 5 0 0 0 10 0V5M6 19h12" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Liste" disabled={disabled || showHtml} onClick={() => run("insertUnorderedList")}>
            <Icon><path d="M9 7h11M9 12h11M9 17h11M5 7h.01M5 12h.01M5 17h.01" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Numaralı liste" disabled={disabled || showHtml} onClick={() => run("insertOrderedList")}>
            <Icon><path d="M10 7h10M10 12h10M10 17h10M4 6h2v4M4 14h2l-2 3h2" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Sola hizala" active={alignValue === "left"} disabled={disabled || showHtml} onClick={() => handleAlign("left")}>
            <Icon><path d="M4 6h16M4 12h10M4 18h14" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Ortala" active={alignValue === "center"} disabled={disabled || showHtml} onClick={() => handleAlign("center")}>
            <Icon><path d="M4 6h16M7 12h10M5 18h14" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Sağa hizala" active={alignValue === "right"} disabled={disabled || showHtml} onClick={() => handleAlign("right")}>
            <Icon><path d="M4 6h16M10 12h10M6 18h14" /></Icon>
          </ToolbarBtn>
          <select
            aria-label="Yazı rengi"
            title="Yazı rengi"
            disabled={disabled || showHtml}
            defaultValue="default"
            onChange={(e) => {
              handleColor(e.target.value);
              e.target.value = "default";
            }}
            className="h-11 rounded-md border border-border bg-surface px-2 text-[13px] text-fg disabled:opacity-40"
          >
            <option value="default">Renk</option>
            {COLORS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ToolbarBtn title="Biçimi temizle" disabled={disabled || showHtml} onClick={() => run("removeFormat")}>
            <Icon><path d="M4 7h10M9 7l5 12M15 5l5 5M16 16l4 4M20 16l-4 4" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Geri al" disabled={disabled || showHtml} onClick={() => run("undo")}>
            <Icon><path d="M9 14 4 9l5-5M4 9h10a6 6 0 1 1 0 12h-3" /></Icon>
          </ToolbarBtn>
          <ToolbarBtn title="Yinele" disabled={disabled || showHtml} onClick={() => run("redo")}>
            <Icon><path d="m15 14 5-5-5-5M20 9H10a6 6 0 1 0 0 12h3" /></Icon>
          </ToolbarBtn>
          <div className="ml-auto">
            <ToolbarBtn title={showHtml ? "Düzenleyiciye dön" : "HTML kaynağı"} active={showHtml} disabled={disabled} onClick={() => setShowHtml((v) => !v)}>
              <Icon><path d="m8 8-4 4 4 4M16 8l4 4-4 4" /></Icon>
            </ToolbarBtn>
          </div>
        </div>
        <div className="relative">
          {placeholder && isEmpty && !showHtml ? (
            <div className="pointer-events-none absolute top-2.5 left-3.5 text-sm text-fg-subtle">{placeholder}</div>
          ) : null}
          {showHtml ? (
            <textarea
              id={inputId}
              disabled={disabled}
              value={value || ""}
              onChange={(e) => {
                const next = normalize(e.target.value);
                lastValueRef.current = next;
                onChange(next);
              }}
              onBlur={onBlur}
              className={cn("w-full resize-y bg-transparent px-3.5 py-2.5 font-mono text-xs text-fg outline-none", minHeight, disabled && "cursor-not-allowed")}
            />
          ) : (
            <div
              id={inputId}
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-invalid={field?.invalid || undefined}
              onInput={emit}
              onPaste={onPaste}
              onBlur={() => {
                emit();
                onBlur?.();
              }}
              className={cn(
                "w-full px-3.5 py-2.5 text-sm leading-relaxed text-fg outline-none",
                "[&_b]:font-bold [&_em]:italic [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-0.5 [&_h3]:font-semibold [&_i]:italic [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-1 [&_strong]:font-bold [&_u]:underline [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
                minHeight,
                disabled && "cursor-not-allowed",
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}
