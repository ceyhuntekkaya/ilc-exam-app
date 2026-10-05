"use client";

import { cn } from "@/src/lib/utils/cn";

export type FilterTabItem = { label: string; value: string | null; count?: number };

/**
 * Liste kartının üst şeridindeki durum filtresi (Tümü | Aktif | Askıda …).
 * Seçili sekme alt çizgiyle işaretlenir; değer URL'de tutulur, bileşen yalnız `onChange` çağırır.
 */
export function FilterTabs({
  items,
  value,
  onChange,
  label = "Filtre",
}: {
  items: FilterTabItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
}) {
  return (
    <nav aria-label={label} className="scrollbar-none -mb-px flex overflow-x-auto px-2">
      {items.map((item) => {
        const active = (value ?? null) === item.value;
        return (
          <button
            key={item.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span
                className={cn(
                  "numeric rounded-full px-1.5 text-[11px] font-semibold",
                  active ? "bg-primary-50 text-primary" : "bg-neutral-100 text-fg-subtle",
                )}
              >
                {item.count.toLocaleString("tr-TR")}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
