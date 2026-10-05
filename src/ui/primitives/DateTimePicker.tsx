"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { cn } from "@/src/lib/utils/cn";
import { DatePicker, type DatePickerTheme } from "@/src/ui/primitives/DatePicker";
import { Select } from "@/src/ui/primitives/Select";

/**
 * Tarih + saat seçici — `Input type="datetime-local"` admin/staff/vitrinde bunu çizer (native alan stillenemez).
 *
 * Değer sözleşmesi native `datetime-local` ile AYNI: "yyyy-MM-ddTHH:mm".
 * - `name` verilirse gizli input FormData'ya bu değeri yazar (form gönderimi değişmez).
 * - `onChange` native olay biçiminde çağrılır (`e.target.value`), kontrollü/kontrolsüz kullanım ikisi de çalışır.
 * Tarih: projenin takvimi (DatePicker). Saat: saat + dakika (5 dk adım) seçicileri.
 * Tarih seçilip saat seçilmemişse `defaultTime` kullanılır (varsayılan 09:00).
 */
type Props = {
  id?: string;
  name?: string;
  form?: string;
  value?: string;
  defaultValue?: string;
  /** "yyyy-MM-dd" veya "yyyy-MM-ddTHH:mm" — takvimde öncesi pasif. */
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  "aria-label"?: string;
  className?: string;
  theme: DatePickerTheme;
  defaultTime?: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
};

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, m) => String(m * 5).padStart(2, "0"));

function split(value?: string) {
  if (!value) return { date: "", time: "" };
  const [date, time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

export function DateTimePicker({
  id,
  name,
  form,
  value,
  defaultValue,
  min,
  max,
  required,
  disabled,
  invalid,
  describedBy,
  "aria-label": ariaLabel,
  className,
  theme,
  defaultTime = "09:00",
  onChange,
}: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const current = controlled ? (value ?? "") : inner;
  const { date, time } = split(current);
  const [hh, mm] = (time || "").split(":");
  const hidden = useRef<HTMLInputElement>(null);
  const minutes = mm && !MINUTES.includes(mm) ? [...MINUTES, mm].sort() : MINUTES;

  function commit(next: string) {
    if (!controlled) setInner(next);
    const el = hidden.current;
    if (!el) return;
    // Gizli input'un değeri React render'ından önce güncellenir ki olayı dinleyen hemen doğru değeri okusun.
    el.value = next;
    onChange?.({ target: el, currentTarget: el } as ChangeEvent<HTMLInputElement>);
  }

  function setDate(nextDate: string) {
    if (!nextDate) return commit("");
    commit(`${nextDate}T${time || defaultTime}`);
  }

  function setTime(nextH: string, nextM: string) {
    if (!date) return;
    commit(`${date}T${nextH}:${nextM}`);
  }

  const compact = theme === "admin";

  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5", className)} role="group" aria-label={ariaLabel} aria-describedby={describedBy}>
      <input ref={hidden} type="hidden" name={name} form={form} value={current} />
      <DatePicker
        id={id}
        theme={theme}
        value={date}
        min={min ? split(min).date || min : undefined}
        max={max ? split(max).date || max : undefined}
        required={required}
        disabled={disabled}
        invalid={invalid}
        aria-label={ariaLabel ? `${ariaLabel} — tarih` : "Tarih"}
        onChange={(e) => setDate(e.target.value)}
      />
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-md",
          !date && "opacity-50",
        )}
        title={date ? undefined : "Önce tarih seçin"}
      >
        <div className={compact ? "w-[4.25rem]" : "w-20"}>
          <Select
            aria-label="Saat"
            value={hh || defaultTime.split(":")[0]}
            disabled={disabled || !date}
            invalid={invalid}
            onChange={(e) => setTime(e.target.value, mm || defaultTime.split(":")[1])}
          >
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </Select>
        </div>
        <span aria-hidden className="px-0.5 font-semibold text-fg-subtle">:</span>
        <div className={compact ? "w-[4.25rem]" : "w-20"}>
          <Select
            aria-label="Dakika"
            value={mm || defaultTime.split(":")[1]}
            disabled={disabled || !date}
            invalid={invalid}
            onChange={(e) => setTime(hh || defaultTime.split(":")[0], e.target.value)}
          >
            {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
      </div>
    </div>
  );
}
