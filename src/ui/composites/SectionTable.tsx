import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { EmptyState } from "@/src/ui/composites/EmptyState";

/** Sütun: düz başlık ya da hizalı başlık. `align: "right"` para/adet sütunları içindir (tabular rakamlar). */
export type SectionColumn = string | { label: string; align?: "left" | "right" };

/**
 * Panel detay bölümlerindeki salt-okunur tablo (DataGrid ile aynı görsel dil; sıralama/sayfalama yok).
 * İlk sütun kaydın adı olarak vurgulanır; başlığı boş son sütun satır eylemleri içindir ve sağa yaslanır.
 */
export function SectionTable({
  columns,
  rows,
  empty,
  emptyHint = "Kayıt oluştuğunda bu alanda listelenecektir.",
  flush = false,
}: {
  columns: SectionColumn[];
  rows: ReactNode[][];
  /** Boş durum başlığı; resmî ve bağlamlı yazılır ("Kargo kaydı bulunmamaktadır"). */
  empty: string;
  emptyHint?: string;
  /** Çerçeveli bir kartın içinde: kendi çerçevesi/köşesi çizilmez (kart içinde kart olmasın). */
  flush?: boolean;
}) {
  if (!rows.length) return <EmptyState title={empty} description={emptyHint} />;
  const specs = columns.map((column) => (typeof column === "string" ? { label: column, align: column === "" ? "right" : "left" } : { align: "left", ...column }));
  return (
    <div className={cn("overflow-x-auto", !flush && "rounded-lg border border-border")}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-bg">
            {specs.map((column, index) => (
              <th
                key={`${column.label}-${index}`}
                scope="col"
                className={cn("px-3 py-2 text-xs font-semibold whitespace-nowrap text-fg-muted", column.align === "right" ? "text-right" : "text-left")}
              >
                {column.label || <span className="sr-only">İşlemler</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={index} className="transition-colors hover:bg-bg/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "px-3 py-2.5 align-middle",
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
  );
}
