"use client";

import { htmlOf, type HtmlValue } from "@/src/features/exam-player/types";
import { Field } from "@/src/ui";
import { HtmlEditor } from "@/src/ui/composites/HtmlEditor";

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
    <HtmlEditor
      value={htmlOf(value)}
      disabled={disabled}
      placeholder={placeholder}
      minHeight={rows <= 3 ? "min-h-[88px]" : rows <= 5 ? "min-h-[140px]" : "min-h-[200px]"}
      onChange={(html) => onChange({ html })}
    />
  );
  if (!label) return input;
  return (
    <Field label={label} hint={hint}>
      {input}
    </Field>
  );
}
