"use client";

import { cn } from "@/src/lib/utils/cn";
import { IconChevronDown, IconChevronUp } from "@/src/ui/icons";
import { type ComponentPropsWithRef, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";

/**
 * Admin sayısal alanı — `Input type="number"` admin varyantında bunu çizer (sayfalarda değişiklik gerekmez).
 *
 * Değer sözleşmesi DEĞİŞMEZ: alan hâlâ native `<input type="number">`; onChange/onBlur aynı olay nesnesiyle,
 * `e.target.value` string olarak gelir → çağıranlar `Number(...)` ile backend'e aynı biçimde gönderir.
 *
 * Eklenenler:
 * - Native spinner gizli; sağda ▲▼ adım düğmeleri (min/max'ta pasif). Düğmeler odağı çalmaz (onBlur kaydı tek sefer).
 * - Shift + ok / Shift + düğme → 10 adım.
 * - Fare tekerleği değeri değiştirmez (odaklıyken kaydırma kazaları).
 * - `e`, `E`, `+` ve (min ≥ 0 ise) `-` tuşları engellenir.
 * - Odak bırakılınca değer [min, max] aralığına çekilir (ör. 150 → 100).
 * - `suffix`: alanın içinde sağda birim ("dk", "%", "puan").
 */
type Props = Omit<ComponentPropsWithRef<"input">, "type"> & {
  invalid?: boolean;
  suffix?: string;
  baseClassName: string;
  stateClassName: string;
};

function setNativeValue(node: HTMLInputElement, value: string) {
  // React'in onChange'i tetiklensin: native setter + input olayı (kontrollü ve kontrolsüz kullanımda çalışır).
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(node, value);
  node.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Adım düğmesinden kendi alanını bul (ref birleştirmeden; dışarıdan gelen `ref` olduğu gibi aktarılır). */
function inputOf(button: HTMLElement) {
  return button.closest("[data-input-wrapper]")?.querySelector("input");
}

/** Sarmalayıcıya taşınan genişlik: yalnız bağımsız `w-*` (ör. w-16) — `max-w-*` / `min-w-*` input'ta kalır. */
function widthClass(className?: string) {
  return className?.split(/\s+/).find((c) => /^w-/.test(c));
}

function withoutWidth(className?: string) {
  return className?.split(/\s+/).filter((c) => !/^w-/.test(c)).join(" ");
}

function decimals(step: string | number | undefined) {
  const s = String(step ?? "1");
  return s.includes(".") ? s.split(".")[1].length : 0;
}

export function NumberInput({ ref, suffix, invalid, baseClassName, stateClassName, className, min, max, step, disabled, readOnly, onKeyDown, onBlur, onWheel, ...props }: Props) {
  const minN = min === undefined || min === "" ? undefined : Number(min);
  const maxN = max === undefined || max === "" ? undefined : Number(max);
  const stepN = step === undefined || step === "any" ? 1 : Number(step) || 1;
  // `step` verilmediyse yuvarlama yok (native davranış: 2.5 yazılıp kaydedilebilir); verildiyse step ondalığına.
  const places = step === undefined || step === "any" ? null : decimals(step);
  const current = props.value !== undefined && props.value !== null && props.value !== "" ? Number(props.value) : undefined;
  const atMin = current !== undefined && minN !== undefined && current <= minN;
  const atMax = current !== undefined && maxN !== undefined && current >= maxN;
  const inactive = disabled || readOnly;

  function clamp(n: number) {
    let v = n;
    if (minN !== undefined) v = Math.max(minN, v);
    if (maxN !== undefined) v = Math.min(maxN, v);
    // Adım düğmesi kayan nokta artığı bırakmasın (0.1 + 0.2), ama yazılan ondalık korunsun.
    return places === null ? Number(v.toFixed(10)) : Number(v.toFixed(places));
  }

  function nudge(node: HTMLInputElement | null | undefined, dir: 1 | -1, big: boolean) {
    if (!node || inactive) return;
    const raw = node.value === "" ? (dir > 0 ? (minN ?? 0) - stepN : (maxN ?? minN ?? 0) + stepN) : Number(node.value);
    setNativeValue(node, String(clamp(raw + dir * stepN * (big ? 10 : 1))));
    // onBlur ile kaydeden formlar: odak alanda olsun ki dışarı tıklayınca kayıt tetiklensin.
    if (document.activeElement !== node) node.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (["e", "E", "+"].includes(event.key) || (event.key === "-" && minN !== undefined && minN >= 0)) {
      event.preventDefault();
    } else if (event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      nudge(event.currentTarget, event.key === "ArrowUp" ? 1 : -1, true);
    }
    onKeyDown?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    const node = event.currentTarget;
    if (node.value !== "" && !Number.isNaN(Number(node.value))) {
      const fixed = String(clamp(Number(node.value)));
      if (fixed !== node.value) setNativeValue(node, fixed);
    }
    onBlur?.(event);
  }

  const keepFocus = (event: MouseEvent) => event.preventDefault();

  return (
    <div data-input-wrapper className={cn("group/num relative", widthClass(className))}>
      <input
        {...props}
        ref={ref}
        type="number"
        inputMode={places === null || places > 0 || (minN !== undefined && minN < 0) ? "decimal" : "numeric"}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onWheel={(event) => {
          if (document.activeElement === event.currentTarget) event.currentTarget.blur();
          onWheel?.(event);
        }}
        className={cn(
          baseClassName,
          stateClassName,
          "numeric [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          suffix ? "pr-14" : "pr-8",
          withoutWidth(className),
        )}
      />
      {suffix ? (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-7 flex items-center pr-1.5 text-xs text-fg-subtle">
          {suffix}
        </span>
      ) : null}
      {inactive ? null : (
        <span className="absolute inset-y-px right-px flex w-6 flex-col overflow-hidden rounded-r-[5px] border-l border-border opacity-70 transition-opacity group-focus-within/num:opacity-100 group-hover/num:opacity-100">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Artır"
            disabled={atMax}
            onMouseDown={keepFocus}
            onClick={(event) => nudge(inputOf(event.currentTarget), 1, event.shiftKey)}
            className="flex flex-1 items-center justify-center text-fg-subtle hover:bg-primary-50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronUp className="size-3" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Azalt"
            disabled={atMin}
            onMouseDown={keepFocus}
            onClick={(event) => nudge(inputOf(event.currentTarget), -1, event.shiftKey)}
            className="flex flex-1 items-center justify-center border-t border-border text-fg-subtle hover:bg-primary-50 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
          >
            <IconChevronDown className="size-3" strokeWidth={2.25} />
          </button>
        </span>
      )}
    </div>
  );
}
