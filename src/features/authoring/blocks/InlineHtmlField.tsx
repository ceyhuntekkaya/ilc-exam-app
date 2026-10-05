"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Field, Input } from "@/src/ui";

export type InlineHtml = HtmlValue;

export function asInlineHtmlObj(value: HtmlValue): { html: string } {
  return { html: htmlOf(value) };
}

/** Tek satırlık HTML metni. Etiket verilirse `Field` ile bağlı; verilmezse `aria-label` placeholder'dan. */
export function InlineHtmlField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  hint,
}: {
  label?: string;
  value: InlineHtml;
  onChange: (v: { html: string }) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  const input = (
    <Input
      value={htmlOf(value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={label ? undefined : placeholder}
      onChange={(e) => onChange({ html: e.target.value })}
    />
  );
  if (!label) return input;
  return (
    <Field label={label} hint={hint}>
      {input}
    </Field>
  );
}
