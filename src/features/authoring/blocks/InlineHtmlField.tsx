"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Input } from "@/src/ui";

export type InlineHtml = HtmlValue;

export function asInlineHtmlObj(value: HtmlValue): { html: string } {
  return { html: htmlOf(value) };
}

export function InlineHtmlField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label?: string;
  value: InlineHtml;
  onChange: (v: { html: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {label ? <p className="text-xs font-medium text-fg-muted">{label}</p> : null}
      <Input
        value={htmlOf(value)}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange({ html: e.target.value })}
      />
    </div>
  );
}
