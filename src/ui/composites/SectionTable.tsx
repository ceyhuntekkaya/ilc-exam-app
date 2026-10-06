import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { EmptyState } from "@/src/ui/composites/EmptyState";
import { Skeleton, SkeletonStatus } from "@/src/ui/composites/Skeleton";
import { UiVariantProvider } from "@/src/ui/primitives/UiVariant";

/** Sütun: düz başlık ya da hizalı başlık. `align: "right"` para/adet sütunları içindir (tabular rakamlar). */
export type SectionColumn = string | { label: string; align?: "left" | "right" };

const WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3"];

/**
 * Panel bölüm tablosu — DataGrid ile aynı kart dili: tek çerçeve içinde
 *   [tabs: durum filtresi] → [toolbar: sayı · arama · Ekle] → [tablo | iskelet | boş durum].
 * Sekme, araç çubuğu ve tablo ayrı ayrı yüzmez; "Ekle" düğmesi tablonun başlığına oturur.
 * İlk sütun kaydın adıdır; başlığı boş son sütun satır eylemleridir ve sağa yaslanır.
 * `loading`: başlıklar gerçek, gövde iskelet — veri gelince düzen zıplamaz.
 * Boş durum kartın içinde (`EmptyState embedded`); filtre/arama sonucu boşsa `emptyTone="neutral"`.
 */
export function SectionTable({
  columns,
  rows,
  empty,
  emptyHint = "Kayıt oluştuğunda bu alanda listelenecektir.",
  emptyAction,
  emptyTone = "primary",
  emptyIcon,
  tabs,
  toolbar,
  loading = false,
}: {
  columns: SectionColumn[];
  rows: ReactNode[][];
  /** Boş durum başlığı; bağlamlı yazılır ("Henüz kampüs yok"). */
  empty: string;
  emptyHint?: ReactNode;
  /** Boş durumda birincil eylem (ör. "İlk kampüsü ekle"). */
  emptyAction?: ReactNode;
  emptyTone?: "primary" | "neutral" | "warning";
  emptyIcon?: ReactNode;
  /** Kartın üst şeridi: `FilterTabs`. */
  tabs?: ReactNode;
  /** Sekmelerin altındaki şerit: `SectionToolbar` (sayı + arama + eylemler). */
  toolbar?: ReactNode;
  /** Geriye uyumluluk: artık her zaman kart çizilir. */
  flush?: boolean;
  loading?: boolean;
}) {
  const specs = columns.map((column) => (typeof column === "string" ? { label: column, align: column === "" ? "right" : "left" } : { align: "left", ...column }));
  const isEmpty = !loading && rows.length === 0;
  return (
    <div data-section-table className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {tabs ? <div className="border-b border-border">{tabs}</div> : null}
      {/* Araç çubuğu her panelde aynı sıkı ölçüde (admin varyantı, 32px kontroller): sayı yazısının yanında
          44px staff kontrolleri şeridi şişiriyor ve hizayı bozuyordu. */}
      {toolbar ? (
        <div className="border-b border-border bg-neutral-50/50 px-3.5 py-2 sm:px-4">
          <UiVariantProvider variant="admin">{toolbar}</UiVariantProvider>
        </div>
      ) : null}
      {isEmpty ? (
        <EmptyState embedded tone={emptyTone} icon={emptyIcon} title={empty} description={emptyHint} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          {loading ? <SkeletonStatus label="Kayıtlar yükleniyor" /> : null}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-neutral-50">
                {specs.map((column, index) => (
                  <th
                    key={`${column.label}-${index}`}
                    scope="col"
                    className={cn(
                      "px-3.5 py-2.5 text-[11.5px] font-semibold tracking-wide whitespace-nowrap text-fg-subtle sm:first:pl-4 sm:last:pr-4",
                      column.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {column.label || <span className="sr-only">İşlemler</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading
                ? Array.from({ length: 4 }, (_, row) => (
                    <tr key={row}>
                      {specs.map((column, col) => (
                        <td key={col} className="px-3.5 py-3.5 sm:first:pl-4 sm:last:pr-4">
                          {column.align === "right" ? (
                            <Skeleton className="ml-auto h-6 w-16" />
                          ) : (
                            <Skeleton className={cn("h-3.5", WIDTHS[(row + col) % WIDTHS.length])} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                : rows.map((row, index) => (
                    <tr key={index} className="transition-colors hover:bg-primary-50/40">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={cn(
                            "px-3.5 py-3 align-middle sm:first:pl-4 sm:last:pr-4",
                            cellIndex === 0 ? "font-medium text-fg" : "text-fg-muted",
                            specs[cellIndex]?.align === "right" && "numeric text-right whitespace-nowrap",
                          )}
                        >
                          {cell ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Bölüm tablosunun üst şeridi (`SectionTable toolbar` içinde): solda kayıt sayısı ("12 kampüs"),
 * sağda arama ve eylemler. Dar ekranda eylemler alta iner ve tam genişlik olur.
 */
export function SectionToolbar({
  count,
  noun,
  loading = false,
  children,
}: {
  count?: number;
  /** Sayının yanındaki ad (tekil, Türkçe sayılarla çoğul eki almaz: "3 kampüs"). */
  noun: string;
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-8 flex-wrap items-center gap-x-3 gap-y-2">
      <div className="mr-auto flex h-8 shrink-0 items-center text-[13px] text-fg-muted">
        {loading || count == null ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          // Tek satır öğe: flex kapta sayı ve ad ayrı öğe olunca aradaki boşluk yutuluyor ve alt alta kırılıyordu.
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span className="numeric font-semibold text-fg">{count.toLocaleString("tr-TR")}</span>
            <span>{noun}</span>
          </span>
        )}
      </div>
      {/* Doğrudan düğme/bağlantılar alanlarla aynı yükseklikte (sm = 28px yerine 32px). Dar ekranda alanlar tam genişlik. */}
      {children ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end [&>a]:h-8 [&>button]:h-8 [&>button]:px-3 [&>a]:px-3 [&>a]:text-[13px] [&>button]:text-[13px]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
