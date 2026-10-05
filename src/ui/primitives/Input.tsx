"use client";

import { useField } from "@/src/ui/primitives/Field";
import { useUiVariant, type UiVariant } from "@/src/ui/primitives/UiVariant";
import { cn } from "@/src/lib/utils/cn";
import { IconAlert, IconX } from "@/src/ui/icons";
import { inlineControlClass, inlineGroupClass, inlineLabelClass } from "@/src/ui/primitives/inline-label";
import { DatePicker } from "@/src/ui/primitives/DatePicker";
import { NumberInput } from "@/src/ui/primitives/NumberInput";
import { DateTimePicker } from "@/src/ui/primitives/DateTimePicker";
import { useState, type ComponentPropsWithRef, type MouseEvent, type ReactNode } from "react";

/**
 * default:    panel (admin/satıcı) ve mevcut formlar — orijinal görünüm.
 * storefront: vitrin (public) — ../dis-sepetim Input'unun görünümü.
 * admin:      yönetim paneli — kompakt (h-8, 13px), dolgulu zemin; odakta beyaz + marka turuncusu halka.
 */
export type InputVariant = UiVariant;

// ComponentPropsWithRef: React 19'da `ref` normal prop; dis-sepetim'deki forwardRef ile aynı işlev (form kütüphaneleri için).
type Props = ComponentPropsWithRef<"input"> & {
  invalid?: boolean;
  variant?: InputVariant;
  /** Solda gösterilen ikon; verilirse input sarmalanır ve sola boşluk bırakılır. */
  icon?: ReactNode;
  /** Tam yuvarlak (hap) köşe — ör. header araması. cn çakışmaları çözmediği için className'e rounded-* yazmak yerine bu kullanılır. */
  pill?: boolean;
  /** Sağda gösterilen etkileşimli öğe (ör. parola göster/gizle butonu). Verilirse storefront hata ikonu yerine bu gösterilir. */
  trailing?: ReactNode;
  /**
   * Sağda yazılı eylem butonu (ör. kategori içi aramadaki "Ara"). `trailing` ikon butonu içindir (44px boşluk);
   * bu geniş butona göre boşluk bırakır. Verilirse `trailing` ve hata ikonu gösterilmez.
   */
  action?: ReactNode;
  /** `icon` verildiğinde sarmalayıcı div'e eklenecek sınıflar. */
  wrapperClassName?: string;
  /** Yalnız admin: etiket kontrolün içinde solda gösterilir (Field'sız kullanım, ör. filtre şeridindeki tarih). */
  inlineLabel?: string;
  /** Yalnız admin sayısal alan: içeride sağda birim ("dk", "%", "puan"). */
  suffix?: string;
};

// Renk sınıfları yalnızca valid/invalid içinde: cn çakışan sınıfları ayıklamadığı için aynı özelliği (bg, text,
// placeholder, border) hem base'te hem invalid'de yazmak, derlenmiş CSS sırasına göre kırmızının kaybetmesine yol açar.
type VariantStyles = { base: string; radius: string; valid: string; invalid: string; withIcon: string; icon: string; iconValid: string; iconInvalid: string };

const variants: Record<InputVariant, VariantStyles> = {
  default: {
    radius: "rounded-md",
    base: "h-11 w-full border bg-surface px-3 text-base text-fg placeholder:text-fg-subtle",
    valid: "border-border-strong",
    invalid: "border-danger",
    withIcon: "pl-10",
    icon: "left-3",
    iconValid: "text-fg-subtle",
    iconInvalid: "text-fg-subtle",
  },
  admin: {
    radius: "rounded-md",
    base: "h-8 w-full border bg-bg px-2.5 text-[13px] text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow,background-color] focus:bg-surface focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
    valid: "border-border hover:border-border-strong focus:border-primary-500 focus:ring-primary-500/15",
    invalid: "border-danger focus:border-danger focus:ring-danger-500/15",
    withIcon: "pl-8",
    icon: "left-2.5 [&>svg]:size-3.5",
    iconValid: "text-fg-subtle",
    iconInvalid: "text-danger",
  },
  staff: {
    radius: "rounded-md",
    base: "min-h-11 h-11 w-full border bg-bg px-3 text-base text-fg placeholder:text-fg-subtle outline-none transition-[border-color,box-shadow,background-color] focus:bg-surface focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
    valid: "border-border hover:border-border-strong focus:border-primary-500 focus:ring-primary-500/15",
    invalid: "border-danger focus:border-danger focus:ring-danger-500/15",
    withIcon: "pl-10",
    icon: "left-3",
    iconValid: "text-fg-subtle",
    iconInvalid: "text-danger",
  },
  storefront: {
    radius: "rounded-lg",
    base: "h-10 w-full border px-3 text-sm outline-none transition-shadow focus:ring-2 disabled:pointer-events-none disabled:opacity-50",
    valid:
      "border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-500/15 disabled:hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600 dark:focus:ring-primary-400/20",
    // dis-sepetim FormInput hata durumu: kırmızı kenar, hafif kırmızı zemin, sağda uyarı ikonu; yazı ve placeholder da kırmızı tonda.
    invalid:
      "border-danger-600 bg-danger-50/40 text-danger-700 placeholder:text-danger-400 hover:border-danger-600 focus:border-danger-600 focus:ring-danger-500/20 dark:border-danger-500 dark:bg-danger-950/20 dark:text-danger-300 dark:placeholder:text-danger-600 dark:hover:border-danger-500 dark:focus:ring-danger-400/25",
    withIcon: "pl-10",
    icon: "left-3.5",
    iconValid: "text-neutral-400",
    iconInvalid: "text-danger-600 dark:text-danger-400",
  },
};

export function Input({ className, invalid, id, variant: variantProp, icon, trailing, action, pill = false, wrapperClassName, inlineLabel, suffix, ...props }: Props) {
  const field = useField();
  const uiVariant = useUiVariant();
  // Açık prop > içinde bulunduğu Field > UiVariantProvider > default.
  const variant = variantProp ?? field?.variant ?? uiVariant;
  const isInvalid = invalid ?? field?.invalid ?? false;
  const styles = variants[variant];
  const side = action ? null : trailing;
  // Vitrin arama alanı: tarayıcının stilsiz "x"i gizlenir (globals.css), yerine tasarıma uygun temizle butonu.
  // Sarmalayıcı yazı olup olmamasından bağımsız hep verilir; yoksa ilk harfte input yeniden oluşup odak kaybolur.
  const clearable = variant !== "default" && props.type === "search" && !side && !props.disabled && !props.readOnly;
  const [typed, setTyped] = useState(() => String(props.defaultValue ?? "") !== "");
  const filled = props.value !== undefined ? String(props.value ?? "") !== "" : typed;
  const showClear = clearable && filled;
  const errorIcon = variant === "storefront" && isInvalid && !side && !action && !showClear;
  // Sağ boşluk tek sınıfla: eylem (+ temizle) > trailing buton > temizle/hata ikonu (cn çakışmayı ayıklamadığı için biri verilir).
  const paddingRight = action ? (showClear ? "pr-28" : "pr-20") : side ? "pr-11" : showClear || errorIcon ? "pr-9" : null;
  const { onChange, ...rest } = props;
  // Tarih: native takvim penceresi stillenemediği için admin/vitrinde tasarıma uygun takvim (DatePicker). default varyant
  // (panel formları) native kalır.
  if (props.type === "date" && variant !== "default") {
    return (
      <DatePicker
        theme={variant}
        id={id ?? field?.id}
        name={props.name}
        form={props.form}
        value={props.value === undefined ? undefined : String(props.value ?? "")}
        defaultValue={props.defaultValue === undefined ? undefined : String(props.defaultValue ?? "")}
        min={props.min === undefined ? undefined : String(props.min)}
        max={props.max === undefined ? undefined : String(props.max)}
        required={props.required}
        disabled={props.disabled}
        placeholder={props.placeholder}
        invalid={isInvalid}
        describedBy={field?.describedBy}
        aria-label={props["aria-label"]}
        inlineLabel={variant === "admin" ? inlineLabel : undefined}
        className={variant === "admin" && inlineLabel ? wrapperClassName : className}
        onChange={onChange}
      />
    );
  }
  // Tarih + saat: native datetime-local stillenemediği için takvim + saat/dakika seçici (değer biçimi aynı).
  if (props.type === "datetime-local" && variant !== "default") {
    return (
      <DateTimePicker
        theme={variant}
        id={id ?? field?.id}
        name={props.name}
        form={props.form}
        value={props.value === undefined ? undefined : String(props.value ?? "")}
        defaultValue={props.defaultValue === undefined ? undefined : String(props.defaultValue ?? "")}
        min={props.min === undefined ? undefined : String(props.min)}
        max={props.max === undefined ? undefined : String(props.max)}
        required={props.required}
        disabled={props.disabled}
        invalid={isInvalid}
        describedBy={field?.describedBy}
        aria-label={props["aria-label"]}
        className={className}
        onChange={onChange}
      />
    );
  }
  // Sayı: admin'de native spinner yerine adım düğmeli, sınır kontrollü alan (değer sözleşmesi aynı).
  if (props.type === "number" && variant === "admin" && !inlineLabel) {
    const { type: _type, ...numberProps } = props;
    void _type;
    return (
      <NumberInput
        {...numberProps}
        id={id ?? field?.id}
        aria-describedby={field?.describedBy}
        data-input-variant={variant}
        invalid={isInvalid}
        suffix={suffix}
        baseClassName={cn(styles.base, styles.radius)}
        stateClassName={isInvalid ? styles.invalid : styles.valid}
        className={className}
      />
    );
  }
  if (variant === "admin" && inlineLabel) {
    return (
      <label className={inlineGroupClass(isInvalid, wrapperClassName)}>
        <span className={inlineLabelClass}>{inlineLabel}</span>
        <input
          {...props}
          id={id ?? field?.id}
          aria-label={inlineLabel}
          aria-invalid={isInvalid || undefined}
          data-input-variant="admin"
          className={cn(inlineControlClass, "pr-2", className)}
        />
      </label>
    );
  }
  // Input sarmalayıcıdan bulunur (dışarıdan gelen `ref` olduğu gibi aktarılır, birleştirilmez).
  const clear = (event: MouseEvent<HTMLButtonElement>) => {
    const node = event.currentTarget.closest("[data-input-wrapper]")?.querySelector("input");
    if (!node) return;
    // React'in onChange'i tetiklensin diye native setter + input olayı (kontrollü ve kontrolsüz kullanımda çalışır).
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(node, "");
    node.dispatchEvent(new Event("input", { bubbles: true }));
    setTyped(false);
    node.focus();
  };
  const clearButton = showClear ? (
    <button
      type="button"
      onClick={clear}
      aria-label="Aramayı temizle"
      className={cn("flex items-center justify-center rounded-full", variant === "admin" ? "size-6" : "size-7", " text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200")}
    >
      <IconX className="size-4" aria-hidden />
    </button>
  ) : null;
  const input = (
    <input
      {...rest}
      onChange={(event) => {
        setTyped(event.target.value !== "");
        onChange?.(event);
      }}
      id={id ?? field?.id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={field?.describedBy}
      data-input-variant={variant}
      className={cn(styles.base, pill ? "rounded-full" : styles.radius, isInvalid ? styles.invalid : styles.valid, icon ? styles.withIcon : null, paddingRight, className)}
    />
  );
  if (!icon && !errorIcon && !side && !action && !clearable) return input;
  return (
    <div data-input-wrapper className={cn("relative", wrapperClassName)}>
      {icon ? (
        <span className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2", styles.icon, isInvalid ? styles.iconInvalid : styles.iconValid)} aria-hidden>
          {icon}
        </span>
      ) : null}
      {input}
      {errorIcon ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-danger-600 dark:text-danger-400" aria-hidden>
          <IconAlert className="size-4.5" />
        </span>
      ) : null}
      {side ? <span className="absolute inset-y-0 right-1 flex items-center">{side}</span> : null}
      {action || clearButton ? (
        <span className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {clearButton}
          {action}
        </span>
      ) : null}
    </div>
  );
}
