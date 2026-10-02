"use client";

import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import { useEffect, useId, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { cn } from "@/src/lib/utils/cn";
import { IconChevronRight, IconX } from "@/src/ui/icons";
import { inlineGroupClass, inlineLabelClass } from "@/src/ui/primitives/inline-label";

export type DatePickerTheme = "admin" | "storefront";

type Props = {
  id?: string;
  name?: string;
  form?: string;
  /** "yyyy-MM-dd" (native date input ile aynı biçim). */
  value?: string;
  defaultValue?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  "aria-label"?: string;
  inlineLabel?: string;
  className?: string;
  theme: DatePickerTheme;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const ISO = "yyyy-MM-dd";
const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];

const themes = {
  admin: {
    trigger:
      "h-8 w-full rounded-md border bg-bg px-2.5 text-[13px] text-fg outline-none transition-[border-color,box-shadow,background-color] focus-visible:bg-surface focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
    valid: "border-border hover:border-border-strong focus-visible:border-primary-500 focus-visible:ring-primary-500/15",
    invalid: "border-danger focus-visible:border-danger focus-visible:ring-danger-500/15",
    placeholder: "text-fg-subtle",
    icon: "size-3.5 text-fg-subtle",
    panel: "rounded-lg border border-border bg-surface p-2.5 shadow-[0_8px_24px_rgb(26_26_24/0.12)] text-[13px]",
    nav: "size-7 rounded-md text-fg-muted hover:bg-bg hover:text-fg",
    title: "text-[13px] font-semibold text-fg",
    weekday: "text-[11px] font-medium text-fg-subtle",
    day: "size-8 rounded-md text-[13px]",
    dayIdle: "text-fg hover:bg-bg",
    dayOutside: "text-fg-subtle/60 hover:bg-bg",
    today: "font-semibold text-primary ring-1 ring-inset ring-primary-500/40",
    selected: "bg-primary text-white font-semibold hover:bg-primary",
    focus: "focus-visible:ring-2 focus-visible:ring-primary-500/40",
    footer: "border-t border-border pt-2 mt-2",
    link: "rounded-md px-2 py-1 text-[12px] font-medium text-primary hover:bg-bg",
    muted: "rounded-md px-2 py-1 text-[12px] font-medium text-fg-muted hover:bg-bg hover:text-fg",
  },
  storefront: {
    trigger:
      "h-10 w-full rounded-lg border px-3 text-sm outline-none transition-shadow focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
    valid:
      "border-neutral-300 bg-white text-neutral-900 hover:border-neutral-400 focus-visible:border-primary-500 focus-visible:ring-primary-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:hover:border-neutral-600",
    invalid: "border-danger-600 bg-danger-50/40 text-danger-700 focus-visible:ring-danger-500/20 dark:border-danger-500 dark:bg-danger-950/20 dark:text-danger-300",
    placeholder: "text-neutral-400 dark:text-neutral-500",
    icon: "size-4 text-neutral-400",
    panel: "rounded-xl border border-neutral-200 bg-white p-3 shadow-lg ring-1 ring-black/5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:ring-white/10",
    nav: "size-8 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-white",
    title: "text-sm font-semibold text-neutral-900 dark:text-white",
    weekday: "text-xs font-medium text-neutral-400",
    day: "size-9 rounded-lg text-sm",
    dayIdle: "text-neutral-700 hover:bg-primary-50 dark:text-neutral-200 dark:hover:bg-primary-950/40",
    dayOutside: "text-neutral-300 hover:bg-neutral-50 dark:text-neutral-600 dark:hover:bg-neutral-800",
    today: "font-semibold text-primary-700 ring-1 ring-inset ring-primary-500/40 dark:text-primary-400",
    selected: "bg-primary-600 text-white font-semibold hover:bg-primary-600",
    focus: "focus-visible:ring-2 focus-visible:ring-primary-500/40",
    footer: "border-t border-neutral-100 pt-2.5 mt-2.5 dark:border-neutral-800",
    link: "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-950/40",
    muted: "rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800",
  },
} satisfies Record<DatePickerTheme, Record<string, string>>;

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden className={cn("shrink-0", className)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/**
 * Tarih seçici (Select'teki liste kutusu ile aynı yaklaşım): native takvim açılır penceresi CSS ile stillenemediği için
 * buton + takvim paneli. Form uyumu için gizli bir input tutulur: `name`, FormData, `required` ve `onChange` native
 * date input gibi çalışır, değer "yyyy-MM-dd". Görünen biçim Türkçe ("30 Eylül 2026"), hafta pazartesi başlar.
 * Klavye (takvimde): ←/→ gün, ↑/↓ hafta, PageUp/PageDown ay (Shift ile yıl), Home/End hafta başı/sonu, Enter seç, Esc kapat.
 */
export function DatePicker({
  id,
  name,
  form,
  value,
  defaultValue,
  min,
  max,
  required,
  disabled,
  placeholder = "Tarih seçiniz",
  invalid = false,
  describedBy,
  "aria-label": ariaLabel,
  inlineLabel,
  className,
  theme,
  onChange,
}: Props) {
  const t = themes[theme];
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = controlled ? (value ?? "") : inner;
  const selected = parse(current);
  const minDate = parse(min);
  const maxDate = parse(max);
  const [open, setOpen] = useState(false);
  const [upward, setUpward] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [focused, setFocused] = useState<Date>(() => selected ?? new Date());
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const buttonId = id ?? `date-${autoId}`;
  const panelId = `${buttonId}-panel`;
  const titleId = `${buttonId}-title`;

  const outOfRange = (date: Date) =>
    Boolean((minDate && date < startOfDay(minDate)) || (maxDate && date > startOfDay(maxDate)));

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  // Klavye odağı takvimdeki odaklı güne taşınır (açılışta ve ok tuşlarıyla gezinirken).
  useEffect(() => {
    if (!open) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${format(focused, ISO)}"]`)?.focus();
  }, [open, focused]);

  // Native input gibi: form sıfırlanınca kontrolsüz değer başlangıca döner.
  const initial = useRef(inner);
  useEffect(() => {
    const owner = hidden.current?.form;
    if (!owner || controlled) return;
    const reset = () => setInner(initial.current);
    owner.addEventListener("reset", reset);
    return () => owner.removeEventListener("reset", reset);
  }, [controlled]);

  const show = () => {
    const rect = button.current?.getBoundingClientRect();
    if (rect) {
      setUpward(window.innerHeight - rect.bottom < 360 && rect.top > window.innerHeight - rect.bottom);
      // Dar alanda (filtre şeridinin sağı) panel ekrandan taşmasın: sağa yaslanır.
      setAlignRight(rect.left + 300 > window.innerWidth);
    }
    setFocused(selected ?? new Date());
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const commit = (next: string) => {
    close();
    if (next === current) return;
    if (!controlled) setInner(next);
    const element = hidden.current;
    if (element) {
      element.value = next;
      onChange?.({ target: element, currentTarget: element } as ChangeEvent<HTMLInputElement>);
      // Form düzeyinde dinleyenler için (ör. filtre şeridi tarih seçilince otomatik uygular): gerçek change olayı.
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const choose = (date: Date) => {
    if (!outOfRange(date)) commit(format(date, ISO));
  };

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
      Home: () => startOfWeek(focused, { weekStartsOn: 1 }),
      End: () => endOfWeek(focused, { weekStartsOn: 1 }),
    };
    if (moves[event.key]) {
      event.preventDefault();
      setFocused(moves[event.key]());
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(focused);
    }
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  const monthStart = startOfMonth(focused);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Sabit 6 hafta: ay değişince panel yüksekliği oynamaz.
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const today = new Date();
  const label = selected ? format(selected, "d MMMM yyyy", { locale: tr }) : "";
  const todayDisabled = outOfRange(startOfDay(today));

  const trigger = (
    <button
      ref={button}
      id={buttonId}
      type="button"
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-describedby={describedBy}
      aria-label={(ariaLabel ?? inlineLabel) ? `${ariaLabel ?? inlineLabel}: ${label || placeholder}` : undefined}
      onClick={() => (open ? close() : show())}
      onKeyDown={(event) => {
        if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          show();
        }
      }}
      className={cn(
        inlineLabel
          ? "flex h-full min-w-0 flex-1 items-center justify-between gap-2 bg-transparent pr-2 pl-1.5 text-left outline-none"
          : cn(t.trigger, invalid ? t.invalid : t.valid, "flex items-center justify-between gap-2 text-left", className),
      )}
    >
      <span className={cn("truncate", inlineLabel && "font-medium text-fg", !label && t.placeholder)}>{label || (inlineLabel ? "Seçiniz" : placeholder)}</span>
      <CalendarIcon className={t.icon} />
    </button>
  );

  return (
    <div ref={root} className="relative w-full">
      <input ref={hidden} type="hidden" name={name} form={form} value={current} data-autosubmit="" />
      {/* Zorunlu alan: gizli input doğrulanmaz; görünmez metin alanı tarayıcı doğrulamasını üstlenir. */}
      {required ? (
        <input tabIndex={-1} aria-hidden required value={current} onChange={() => undefined} className="pointer-events-none absolute inset-0 opacity-0" />
      ) : null}
      {inlineLabel ? (
        // Filtre şeridi: "Başlangıç  30 Eylül 2026" — etiket soluk, değer vurgulu (Input/Select inlineLabel ile aynı kutu).
        <div className={inlineGroupClass(invalid, className)} onClick={(event) => event.target === event.currentTarget && button.current?.click()}>
          <span className={inlineLabelClass}>{inlineLabel}</span>
          {trigger}
        </div>
      ) : (
        trigger
      )}
      {open ? (
        // z-20: sayfa içi açılır katman (globals.css ölçeği); modal içinde modalın katmanında kalır.
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          onKeyDown={onPanelKeyDown}
          className={cn(
            "absolute z-20 w-max animate-fade-in",
            t.panel,
            upward ? "bottom-full mb-1.5" : "top-full mt-1.5",
            alignRight ? "right-0" : "left-0",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setFocused(addMonths(focused, -1))} aria-label="Önceki ay" className={cn("flex items-center justify-center transition-colors", t.nav)}>
              <IconChevronRight className="size-4 rotate-180" aria-hidden />
            </button>
            <p id={titleId} aria-live="polite" className={cn("capitalize", t.title)}>
              {format(focused, "LLLL yyyy", { locale: tr })}
            </p>
            <button type="button" onClick={() => setFocused(addMonths(focused, 1))} aria-label="Sonraki ay" className={cn("flex items-center justify-center transition-colors", t.nav)}>
              <IconChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          <div role="grid" aria-labelledby={titleId} ref={grid} onKeyDown={onGridKeyDown}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAYS.map((day) => (
                <span key={day} role="columnheader" className={cn("flex h-7 items-center justify-center", t.weekday)}>
                  {day}
                </span>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7 gap-0.5">
                {days.slice(week * 7, week * 7 + 7).map((day) => {
                  const isSelected = selected ? isSameDay(day, selected) : false;
                  const isFocused = isSameDay(day, focused);
                  const blocked = outOfRange(day);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      role="gridcell"
                      data-date={format(day, ISO)}
                      tabIndex={isFocused ? 0 : -1}
                      disabled={blocked}
                      aria-selected={isSelected}
                      aria-current={isSameDay(day, today) ? "date" : undefined}
                      aria-label={format(day, "d MMMM yyyy, EEEE", { locale: tr })}
                      onClick={() => choose(day)}
                      className={cn(
                        "numeric flex items-center justify-center outline-none transition-colors",
                        t.day,
                        isSelected ? t.selected : isSameMonth(day, focused) ? t.dayIdle : t.dayOutside,
                        !isSelected && isSameDay(day, today) && t.today,
                        !isSelected && t.focus,
                        blocked && "cursor-not-allowed opacity-35 hover:bg-transparent",
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={cn("flex items-center justify-between gap-2", t.footer)}>
            <button type="button" disabled={todayDisabled} onClick={() => choose(startOfDay(today))} className={cn("transition-colors disabled:opacity-40", t.link)}>
              Bugün
            </button>
            {current && !required ? (
              <button type="button" onClick={() => commit("")} className={cn("inline-flex items-center gap-1 transition-colors", t.muted)}>
                <IconX className="size-3.5" aria-hidden />
                Temizle
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
