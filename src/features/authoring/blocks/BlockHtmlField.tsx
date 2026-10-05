"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Field, Textarea } from "@/src/ui";

export type BlockHtml = HtmlValue;

export function asHtmlObj(value: HtmlValue): { html: string } {
  return { html: htmlOf(value) };
}

/** Çok satırlı HTML metni. Etiket verilirse `Field` ile bağlı (tıklayınca alana odaklanır). */
export function BlockHtmlField({
  label,
  value,
  onChange,
  disabled,
  rows = 4,
  hint,
  placeholder,
}: {
  label?: string;
  value: BlockHtml;
  onChange: (v: { html: string }) => void;
  disabled?: boolean;
  rows?: number;
  hint?: string;
  placeholder?: string;
}) {
  const input = (
    <Textarea
      rows={rows}
      value={htmlOf(value)}
      disabled={disabled}
      placeholder={placeholder}
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
