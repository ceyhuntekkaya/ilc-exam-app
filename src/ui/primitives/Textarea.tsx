"use client";

import { useField } from "@/src/ui/primitives/Field";
import { useUiVariant } from "@/src/ui/primitives/UiVariant";
import { cn } from "@/src/lib/utils/cn";
import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

// default: panel görünümü (değişmedi). storefront: Input storefront ile aynı kenar/odak/hata görünümü (../dis-sepetim FormTextarea).
const variants = {
  default: {
    base: "min-h-28 w-full rounded-md border bg-surface px-3 py-2 text-base text-fg",
    valid: "border-border-strong",
    invalid: "border-danger",
  },
  admin: {
    base: "min-h-24 max-h-60 w-full resize-y rounded-md border bg-bg px-2.5 py-2 text-[13px] leading-relaxed text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow,background-color] focus:bg-surface focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
    valid: "border-border hover:border-border-strong focus:border-primary-500 focus:ring-primary-500/15",
    invalid: "border-danger focus:border-danger focus:ring-danger-500/15",
  },
  storefront: {
    base: "min-h-24 w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-shadow focus:ring-2 disabled:pointer-events-none disabled:opacity-50",
    valid:
      "border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600 dark:focus:ring-primary-400/20",
    invalid:
      "border-danger-600 bg-danger-50/40 text-danger-700 placeholder:text-danger-400 focus:border-danger-600 focus:ring-danger-500/20 dark:border-danger-500 dark:bg-danger-950/20 dark:text-danger-300",
  },
};

export function Textarea({ className, invalid, id, ...props }: Props) {
  const field = useField();
  const uiVariant = useUiVariant();
  const s = variants[field?.variant ?? uiVariant];
  const isInvalid = invalid ?? field?.invalid ?? false;
  return (
    <textarea
      {...props}
      id={id ?? field?.id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      data-input-variant={(field?.variant ?? uiVariant) === "admin" ? "admin" : undefined}
      className={cn(s.base, isInvalid ? s.invalid : s.valid, className)}
    />
  );
}
