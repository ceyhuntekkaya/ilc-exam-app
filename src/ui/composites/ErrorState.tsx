"use client";

import { useState } from "react";

export function ErrorState({
  title = "Bir sorun oluştu",
  message,
  traceId,
}: {
  title?: string;
  message: string;
  traceId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!traceId) return;
    await navigator.clipboard.writeText(traceId);
    setCopied(true);
  }

  return (
    <div className="rounded-lg border border-danger bg-danger-bg px-6 py-8" role="alert">
      <h2 className="text-lg font-semibold text-danger">{title}</h2>
      <p className="mt-2 text-fg">{message}</p>
      {traceId ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-mono text-fg-muted">{traceId}</span>
          <button type="button" className="underline" onClick={copy}>
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </p>
      ) : null}
    </div>
  );
}
