"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/src/lib/utils/cn";
import { IconChevronRight, IconSearch, IconX } from "@/src/ui/icons";
import { Checkbox } from "@/src/ui/primitives/Checkbox";
import { Input } from "@/src/ui/primitives/Input";

export type MultiPickerOption = {
  value: string;
  /** Listede görünen ad. */
  label: string;
  /** Aramada ve seçili çipte bağlam (ör. kategori yolu "Ana › Alt › Ad"); aramaya da dahildir. */
  description?: string;
  /** Ağaç girintisi (0 = kök); arama yokken uygulanır. */
  depth?: number;
  disabled?: boolean;
};

/**
 * Uzun seçenek listesinde çoklu seçim (ör. ek kategoriler): seçilenler üstte çip olarak, altında arama + kaydırılabilir liste.
 * - Seçim yokken bilgi metni; çipte × ile tek tek, "Tümünü temizle" ile topluca kaldırma.
 * - Arama ad ve açıklamada (yol) Türkçe duyarlı; aramada girinti kalkar, bağlam (yol) satırın altında görünür.
 * - "Yalnız seçilenler" ile liste seçilenlere daraltılır; `max` dolunca seçilmemiş satırlar pasifleşir.
 * Satırlar `Checkbox` primitifi (admin görünümü: klavye, ekran okuyucu, marka rengi aynen).
 */
export function MultiPicker({
  options,
  value,
  onChange,
  max,
  searchPlaceholder = "Ara",
  emptyText = "Seçim yapılmamıştır.",
  noResultText = "Aramanızla eşleşen seçenek bulunmamaktadır.",
  label,
  layout = "list",
  collapsible = false,
  codeLabels = false,
}: {
  options: MultiPickerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  searchPlaceholder?: string;
  emptyText?: string;
  noResultText?: string;
  /** Liste için erişilebilir ad (ör. "Ek kategoriler"). */
  label: string;
  /** list: dikey onay kutuları. chips: yan yana seçilebilir etiketler. */
  layout?: "list" | "chips";
  /** Seçenek kataloğu kapalı başlar; seçilenler her zaman görünür. */
  collapsible?: boolean;
  /**
   * Etiket kısa bir kod (ör. kazanım kodu), açıklama asıl metin: listede kod rozeti + açıklama her zaman görünür,
   * seçili çipte yalnız kod (açıklama ipucunda).
   */
  codeLabels?: boolean;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const selected = useMemo(() => new Set(value), [value]);
  const byValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options]);
  const full = max != null && value.length >= max;
  const term = query.trim().toLocaleLowerCase("tr-TR");
  const showCatalog = !collapsible || catalogOpen;

  const shown = options.filter((option) => {
    if (onlySelected && !selected.has(option.value)) return false;
    if (!term) return true;
    return `${option.label} ${option.description ?? ""}`.toLocaleLowerCase("tr-TR").includes(term);
  });

  function toggle(next: string) {
    if (selected.has(next)) onChange(value.filter((item) => item !== next));
    else if (!full) onChange([...value, next]);
  }

  return (
    <div className="grid min-w-0 gap-2.5 rounded-lg border border-border bg-surface p-2.5">
      {/* Seçilenler: listede kaybolmaz, bir bakışta görülür. */}
      <div className="flex min-h-7 flex-wrap items-center gap-1.5">
        {value.length ? (
          <>
            {value.map((item) => {
              const option = byValue.get(item);
              return (
                <span
                  key={item}
                  title={option?.description ?? option?.label}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-50 py-0.5 pr-0.5 pl-2 text-[13px] text-primary-800 ring-1 ring-primary-200"
                >
                  <span className={cn("truncate", codeLabels && "font-mono text-xs font-semibold")}>{option?.label ?? item}</span>
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    aria-label={`${option?.label ?? item} seçimini kaldır`}
                    className="grid size-5 shrink-0 place-items-center rounded text-primary-700 hover:bg-primary-100"
                  >
                    <IconX className="size-3.5" />
                  </button>
                </span>
              );
            })}
            <button type="button" onClick={() => onChange([])} className="px-1 text-xs font-medium text-fg-muted hover:text-danger">
              Tümünü temizle
            </button>
          </>
        ) : (
          <span className="px-0.5 text-[13px] text-fg-subtle">{emptyText}</span>
        )}
      </div>

      {collapsible ? (
        <button
          type="button"
          aria-expanded={catalogOpen}
          aria-controls={listId}
          onClick={() => setCatalogOpen((open) => !open)}
          className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-dashed border-border-strong bg-neutral-50 px-2.5 text-left text-[13px] text-fg-muted hover:border-primary-300 hover:text-fg"
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <IconChevronRight className={cn("size-3.5 shrink-0 text-fg-muted transition-transform", catalogOpen && "rotate-90")} />
            <span className="truncate">{catalogOpen ? "Listeyi kapat" : `${label} listesinden seç`}</span>
          </span>
          <span className="shrink-0 rounded-full bg-surface px-1.5 text-[11px] font-semibold tabular-nums text-fg-subtle ring-1 ring-border">{options.length.toLocaleString("tr-TR")}</span>
        </button>
      ) : null}

      {showCatalog && layout === "chips" ? (
        <div className="grid min-w-0 gap-2">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`${label} içinde ara`}
            aria-controls={listId}
            icon={<IconSearch />}
            wrapperClassName="min-w-0"
          />
          <div
            id={listId}
            role="group"
            aria-label={label}
            className="flex max-h-44 min-w-0 flex-wrap content-start gap-1.5 overflow-y-auto overscroll-contain rounded-md bg-neutral-50 p-2 ring-1 ring-border ring-inset"
          >
            {shown.length ? (
              shown.map((option) => {
                const checked = selected.has(option.value);
                const disabled = option.disabled || (!checked && full);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={checked}
                    disabled={disabled}
                    title={option.description ?? option.label}
                    onClick={() => toggle(option.value)}
                    className={cn(
                      "inline-flex h-7 max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[13px] transition-colors disabled:opacity-50",
                      checked
                        ? "bg-primary-50 font-medium text-primary-800 ring-1 ring-primary-200"
                        : "bg-surface text-fg ring-1 ring-border hover:ring-border-strong",
                    )}
                  >
                    {checked ? <span aria-hidden className="text-primary">✓</span> : null}
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            ) : (
              <p className="px-0.5 py-2 text-[13px] text-fg-subtle">{onlySelected && !value.length ? emptyText : noResultText}</p>
            )}
          </div>
        </div>
      ) : null}

      {showCatalog && layout === "list" ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={`${label} içinde ara`}
          aria-controls={listId}
          icon={<IconSearch />}
          wrapperClassName="min-w-0 flex-1"
        />
        <Checkbox
          checked={onlySelected}
          onChange={(event) => setOnlySelected(event.target.checked)}
          label="Yalnız seçilenler"
          className="shrink-0 text-fg-muted select-none"
        />
      </div>
      ) : null}

      {showCatalog && layout === "list" ? (
      <ul id={listId} role="group" aria-label={label} className="max-h-60 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-border bg-surface p-1">
        {shown.length ? (
          shown.map((option) => {
            const checked = selected.has(option.value);
            const disabled = option.disabled || (!checked && full);
            const flat = Boolean(term || onlySelected);
            return (
              <li
                key={option.value}
                className={cn("rounded-md px-2 transition-colors", codeLabels && "py-1", checked ? "bg-primary-50/70" : "hover:bg-bg")}
                // Ağaç girintisi yalnız arama/filtre yokken: aramada sonuçlar düz liste, bağlam (yol) altında.
                style={!flat && option.depth ? { paddingLeft: `${0.5 + option.depth}rem` } : undefined}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(option.value)}
                  className={cn(!flat && option.depth === 0 && "font-medium", checked && "font-medium")}
                  label={
                    codeLabels ? (
                      <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5">
                        <span className="w-fit shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-fg-muted">{option.label}</span>
                        <span className="wrap-anywhere text-fg">{option.description}</span>
                      </span>
                    ) : (
                      <span className="wrap-anywhere">{option.label}</span>
                    )
                  }
                  description={!codeLabels && flat && option.description && option.description !== option.label ? <span className="wrap-anywhere">{option.description}</span> : undefined}
                />
              </li>
            );
          })
        ) : (
          <li className="px-2 py-6 text-center text-[13px] text-fg-subtle">{onlySelected && !value.length ? emptyText : noResultText}</li>
        )}
      </ul>
      ) : null}

      {showCatalog ? (
        <p className="flex flex-wrap justify-between gap-2 px-0.5 text-xs text-fg-subtle" aria-live="polite">
          <span>{term ? `${shown.length.toLocaleString("tr-TR")} sonuç` : `${options.length.toLocaleString("tr-TR")} seçenek`}</span>
          <span className={full ? "font-medium text-warning" : undefined}>
            {value.length.toLocaleString("tr-TR")}
            {max != null ? ` / ${max}` : ""} seçili{full ? " · sınıra ulaşıldı" : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}
