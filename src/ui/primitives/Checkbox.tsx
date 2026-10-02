"use client";

import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { IconCheck } from "@/src/ui/icons";
import { useUiVariant, type UiVariant } from "@/src/ui/primitives/UiVariant";

type Props = Omit<ComponentPropsWithRef<"input">, "type"> & {
  label: ReactNode;
  /** Etiketin altında küçük açıklama. */
  description?: ReactNode;
  /** Normalde verilmez: UiVariantProvider'dan gelir. */
  variant?: UiVariant;
};

/**
 * default:    panel — native checkbox, etiket solda (mevcut kullanımlarla aynı görünüm).
 * admin:      yönetim paneli — Input/Select admin ile aynı ölçü ve renkler; özel çizilmiş kutu solda, etiket sağda.
 * storefront: vitrin — ../dis-sepetim FormCheckbox: kart şeklinde etiket, özel çizilmiş kutu. Native input `sr-only`
 *             olarak DOM'da kalır (klavye, ekran okuyucu, form gönderimi); odak halkası kutuda gösterilir.
 * Renkler `checked` durumuna göre CSS ile (`has-checked:` / `peer-checked:`) değişir; kontrollü ve kontrolsüz kullanımda çalışır.
 */
export function Checkbox({ label, description, variant: variantProp, className, id, disabled, ...props }: Props) {
  const uiVariant = useUiVariant();
  const variant = variantProp ?? uiVariant;

  // admin: Input/Select admin ile aynı dil — kutu solda, border-border kenar + bg-bg zemin, odakta marka halkası (ring-3),
  // işaretliyken marka dolgusu; etiket 13px. Native input sr-only (klavye, ekran okuyucu, form gönderimi aynen çalışır).
  if (variant === "admin") {
    return (
      <label
        className={cn(
          "group/check flex min-h-8 cursor-pointer items-start gap-2 py-1.5 text-[13px] text-fg",
          "has-disabled:cursor-not-allowed has-disabled:opacity-60",
          className,
        )}
      >
        <input {...props} id={id} type="checkbox" disabled={disabled} className="peer sr-only" />
        <span
          aria-hidden
          className={cn(
            "mt-px flex size-4 shrink-0 items-center justify-center rounded border bg-bg transition-[border-color,box-shadow,background-color]",
            "border-border-strong group-hover/check:border-primary-500",
            "peer-checked:border-primary-600 peer-checked:bg-primary-600",
            "peer-focus-visible:border-primary-500 peer-focus-visible:ring-3 peer-focus-visible:ring-primary-500/15",
            "[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100",
          )}
        >
          <IconCheck className="size-3 text-white transition-opacity" />
        </span>
        <span className="grid min-w-0 gap-0.5 leading-snug">
          <span>{label}</span>
          {description ? <span className="text-xs text-fg-muted">{description}</span> : null}
        </span>
      </label>
    );
  }

  // default: panel görünümü (native kutu), değişmedi.
  if (variant !== "storefront") {
    return (
      <label className={cn("flex items-center justify-between gap-3 text-sm", className)}>
        <span>
          {label}
          {description ? <span className="block text-xs text-fg-muted">{description}</span> : null}
        </span>
        <input {...props} id={id} type="checkbox" disabled={disabled} />
      </label>
    );
  }

  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
        // Hover yalnızca işaretsizken: işaretli rengiyle aynı öğede çakışmasın (cn çakışmaları ayıklamaz).
        "border-neutral-200 text-neutral-700 not-has-checked:hover:border-neutral-300 not-has-checked:hover:bg-neutral-50",
        "has-checked:border-primary-500 has-checked:bg-primary-50 has-checked:text-primary-700",
        "dark:border-neutral-800 dark:text-neutral-300 dark:not-has-checked:hover:border-neutral-700 dark:not-has-checked:hover:bg-neutral-900/60",
        "dark:has-checked:border-primary-400 dark:has-checked:bg-primary-950/30 dark:has-checked:text-primary-300",
        "has-disabled:pointer-events-none has-disabled:opacity-50",
        className,
      )}
    >
      <input {...props} id={id} type="checkbox" disabled={disabled} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
          "border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900",
          "peer-checked:border-primary-600 peer-checked:bg-primary-600 dark:peer-checked:border-primary-500 dark:peer-checked:bg-primary-500",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:ring-offset-1",
          "[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100",
        )}
      >
        <IconCheck className="size-3 text-white transition-opacity" />
      </span>
      <span className="grid gap-0.5">
        <span className="font-medium">{label}</span>
        {description ? <span className="text-xs text-neutral-500 dark:text-neutral-400">{description}</span> : null}
      </span>
    </label>
  );
}
