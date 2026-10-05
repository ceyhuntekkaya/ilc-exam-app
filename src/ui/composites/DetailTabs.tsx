import Link from "next/link";
import { cn } from "@/src/lib/utils/cn";

export type DetailTabItem = { href: string; label: string; current?: boolean };
export type DetailTabGroup = { group: string; items: DetailTabItem[] };

/**
 * Detay sayfasının iki seviyeli yatay gezinmesi (e-ticaret panellerindeki kalıp):
 *   1. seviye — gruplar, başlık kartının alt kenarında alt çizgili sekmeler; grup linki grubun ilk sayfasına gider.
 *   2. seviye — seçili grubun sayfaları, başlık kartının altındaki gri şeritte bölütlü sekmeler; grupta tek sayfa varsa çizilmez.
 * Link olduğu için JS'siz çalışır; dar ekranda yatay kaydırılır.
 */
export function DetailGroupTabs({ groups }: { groups: DetailTabGroup[] }) {
  return (
    <nav aria-label="Bölümler" className="scrollbar-none -mb-px flex overflow-x-auto px-2 sm:px-3">
      {groups.map((group) => {
        const selected = group.items.some((item) => item.current);
        const target = group.items[0];
        if (!target) return null;
        return (
          <Link
            key={group.group}
            href={target.href}
            aria-current={selected ? "true" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              selected ? "border-primary font-semibold text-primary" : "border-transparent text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {group.group}
          </Link>
        );
      })}
    </nav>
  );
}

export function DetailSectionPills({ groups }: { groups: DetailTabGroup[] }) {
  const group = groups.find((item) => item.items.some((entry) => entry.current));
  if (!group || group.items.length < 2) return null;
  return (
    <nav aria-label={`${group.group} sayfaları`} className="scrollbar-none flex gap-1 overflow-x-auto p-0.5">
      {group.items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.current ? "page" : undefined}
          className={cn(
            "inline-flex h-7 shrink-0 items-center rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
            item.current
              ? "bg-surface font-semibold text-fg shadow-xs ring-1 ring-border"
              : "text-fg-muted hover:bg-surface/70 hover:text-fg",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
