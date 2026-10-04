"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Textarea } from "@/src/ui";

export type BlockHtml = HtmlValue;

export function asHtmlObj(value: HtmlValue): { html: string } {
  return { html: htmlOf(value) };
}

export function BlockHtmlField({
  label,
  value,
  onChange,
  disabled,
  rows = 4,
  hint,
}: {
  label?: string;
  value: BlockHtml;
  onChange: (v: { html: string }) => void;
  disabled?: boolean;
  rows?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      {label ? <p className="text-xs font-medium text-fg-muted">{label}</p> : null}
      <Textarea
        rows={rows}
        value={htmlOf(value)}
        disabled={disabled}
        onChange={(e) => onChange({ html: e.target.value })}
      />
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
