import { cn } from "@/src/lib/utils/cn";

/**
 * Admin varyantında `inlineLabel`: etiket kontrolün içinde, solda soluk metin ("Durum  Tümü ▾").
 * Kenar/odak halkası sarmalayıcı <label>'da (focus-within); içteki kontrol kenarsız ve saydam.
 * Filtre şeritleri gibi dar yerlerde, üstte ayrı etiket satırı olmadan bağlamı korur.
 */
export function inlineGroupClass(invalid: boolean, className?: string) {
  return cn(
    "relative flex h-8 w-full items-center rounded-md border bg-bg text-[13px] transition-[border-color,box-shadow,background-color] focus-within:bg-surface focus-within:ring-3 has-disabled:cursor-not-allowed has-disabled:opacity-60",
    invalid
      ? "border-danger focus-within:border-danger focus-within:ring-danger-500/15"
      : "border-border hover:border-border-strong focus-within:border-primary-500 focus-within:ring-primary-500/15",
    className,
  );
}

export const inlineLabelClass = "shrink-0 pl-2.5 text-fg-subtle select-none";

export const inlineControlClass = "h-full min-w-0 flex-1 bg-transparent pl-1.5 font-medium text-fg outline-none";
