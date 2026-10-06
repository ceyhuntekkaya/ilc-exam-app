"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Masaüstünde etiket üzerine gelince açılan önizleme.
 * Tablette hover olmadığı için ayrıca dokunulabilir bir düğme önizlemeyi sabitler.
 */
export function HoverPreview({
  label,
  preview,
  children,
}: {
  label: string;
  preview: ReactNode;
  children: ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;

  return (
    <span
      className="relative inline-flex min-w-0 items-center gap-1"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      <button
        type="button"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-bg hover:text-fg"
        aria-expanded={open}
        aria-label={`${label} önizlemesi`}
        onClick={() => setPinned((value) => !value)}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      {open ? (
        <span
          className={cn(
            "absolute top-full left-0 z-30 mt-1 w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-3 shadow-lg",
          )}
        >
          {pinned ? (
            <span className="mb-2 flex justify-end">
              <button type="button" className="min-h-11 px-2 text-xs font-medium text-fg-muted" onClick={() => setPinned(false)}>
                Kapat
              </button>
            </span>
          ) : null}
          {preview}
        </span>
      ) : null}
    </span>
  );
}
