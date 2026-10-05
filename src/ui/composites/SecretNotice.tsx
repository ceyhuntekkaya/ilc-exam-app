"use client";

import { useState } from "react";

/**
 * Bir kez gösterilen gizli değer (geçici parola, davet kodu): uyarı tonlu şerit + mono değer + kopyala + kapat.
 */
export function SecretNotice({
  label,
  value,
  hint = "Bu değer yalnız şimdi gösterilir; kullanıcıya güvenli bir kanaldan iletin.",
  onDismiss,
}: {
  label: string;
  value: string;
  hint?: string;
  onDismiss?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-secondary-300 bg-secondary-50 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-fg">
          {label}:{" "}
          <span className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold tracking-wide ring-1 ring-secondary-200">{value}</span>
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
          className="h-7 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-fg hover:bg-bg"
        >
          {copied ? "Kopyalandı ✓" : "Kopyala"}
        </button>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} className="h-7 rounded-md px-2 text-xs text-fg-muted hover:bg-surface hover:text-fg" aria-label="Kapat">
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );
}
