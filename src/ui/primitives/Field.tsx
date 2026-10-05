"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { IconAlert } from "@/src/ui/icons";
import { useUiVariant, type UiVariant } from "@/src/ui/primitives/UiVariant";

/** default: panel formları (orijinal görünüm). storefront: vitrin — ../dis-sepetim FormInput etiket/hata görünümü. */
export type FieldVariant = UiVariant;

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; variant: FieldVariant };

const FieldContext = createContext<FieldContextValue | null>(null);

export function useField() {
  return useContext(FieldContext);
}

type Props = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Normalde verilmez: UiVariantProvider'dan gelir. Verilirse onu ezer; içerideki Input'a context ile geçer. */
  variant?: FieldVariant;
  /** Etiketin sağında gösterilen öğe (ör. "Şifremi unuttum" linki). */
  labelAside?: ReactNode;
  children: ReactNode;
};

const styles: Record<FieldVariant, { label: string; required: string; hint: string; error: string }> = {
  default: {
    label: "text-sm font-medium text-fg",
    required: "text-danger",
    hint: "text-sm text-fg-muted",
    error: "text-sm text-danger",
  },
  admin: {
    // 13px: admin kontrollerinin yazı boyutuyla aynı; etiket içerikten soluk değil, okunur.
    label: "text-[13px] font-medium text-fg",
    required: "text-danger",
    // wrap-anywhere: ipucundaki uzun adres/kod (ör. /category/…) sütunu taşırmaz, alt satıra geçer.
    hint: "text-xs leading-relaxed text-fg-subtle wrap-anywhere",
    error: "text-xs text-danger wrap-anywhere",
  },
  staff: {
    label: "text-sm font-medium text-fg",
    required: "text-danger",
    hint: "text-sm leading-relaxed text-fg-subtle wrap-anywhere",
    error: "text-sm text-danger wrap-anywhere",
  },
  storefront: {
    label: "text-sm font-medium text-neutral-700 dark:text-neutral-300",
    required: "text-danger-500",
    hint: "text-xs text-neutral-500 dark:text-neutral-400",
    error: "flex items-center gap-1 text-sm text-danger-600 dark:text-danger-400",
  },
};

export function Field({ label, hint, error, required, variant: variantProp, labelAside, children }: Props) {
  const uiVariant = useUiVariant();
  const variant = variantProp ?? uiVariant;
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const s = styles[variant];

  const labelEl = (
    <label htmlFor={id} className={s.label}>
      {label}
      {required ? (
        <span className={s.required}>
          {" "}
          *<span className="sr-only"> zorunlu</span>
        </span>
      ) : null}
    </label>
  );

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), variant }}>
      {/* content-start: iki sütunlu formda komşu alan (uzun ipucu/hata) satırı uzatınca fazla yükseklik etiket–alan
          arasına dağıtılmaz; etiket ve kontrol her sütunda aynı hizada kalır, boşluk alta toplanır. */}
      <div className={variant === "admin" ? "grid min-w-0 content-start gap-1" : "grid min-w-0 content-start gap-1.5"}>
        {labelAside ? (
          <div className="flex items-center justify-between gap-3">
            {labelEl}
            {labelAside}
          </div>
        ) : (
          labelEl
        )}
        {children}
        {hint ? (
          <p id={hintId} className={s.hint}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className={s.error} role="alert">
            {variant === "storefront" ? <IconAlert aria-hidden className="size-3.5 shrink-0" /> : null}
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}
