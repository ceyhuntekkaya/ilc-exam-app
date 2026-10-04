"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { cn } from "@/src/lib/utils/cn";
import type { ReactNode } from "react";

export function HtmlInline({
  value,
  className,
  fallback = "",
}: {
  value: HtmlValue;
  className?: string;
  fallback?: string;
}) {
  const html = htmlOf(value) || fallback;
  if (!html) return null;
  return (
    <span
      className={cn("[&_p]:inline [&_p]:m-0", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function HtmlBlock({
  value,
  className,
  fallback,
}: {
  value: HtmlValue;
  className?: string;
  fallback?: ReactNode;
}) {
  const html = htmlOf(value);
  if (!html) return fallback ? <>{fallback}</> : null;
  return (
    <div
      className={cn("prose-section max-w-none text-exam-slate-800 [&_img]:max-w-full", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const BLANK_TOKEN_RE = /\[\[([A-Za-z0-9_-]{1,64})\]\]/g;

/** Ordered blank ids as they appear in HTML ([[id]] tokens), including duplicates. */
export function extractBlankIds(html: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(BLANK_TOKEN_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) != null) ids.push(m[1]);
  return ids;
}

/** Split HTML by [[blankId]] tokens; returns alternating text/blank segments. */
export function splitBlankHtml(html: string): Array<{ kind: "text"; html: string } | { kind: "blank"; id: string }> {
  const re = new RegExp(BLANK_TOKEN_RE.source, "g");
  const out: Array<{ kind: "text"; html: string } | { kind: "blank"; id: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) != null) {
    if (m.index > last) out.push({ kind: "text", html: html.slice(last, m.index) });
    out.push({ kind: "blank", id: m[1] });
    last = m.index + m[0].length;
  }
  if (last < html.length) out.push({ kind: "text", html: html.slice(last) });
  if (out.length === 0 && html) out.push({ kind: "text", html });
  return out;
}
