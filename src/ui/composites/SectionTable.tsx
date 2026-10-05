import type { ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { EmptyState } from "@/src/ui/composites/EmptyState";
import { Skeleton, SkeletonStatus } from "@/src/ui/composites/Skeleton";

/** Sütun: düz başlık ya da hizalı başlık. `align: "right"` para/adet sütunları içindir (tabular rakamlar). */
export type SectionColumn = string | { label: string; align?: "left" | "right" };

const WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3"];

/**
 * Panel detay bölümlerindeki salt-okunur tablo (DataGrid ile aynı görsel dil; sıralama/sayfalama yok).
 * İlk sütun kaydın adı olarak vurgulanır; başlığı boş son sütun satır eylemleri içindir ve sağa yaslanır.
 * `loading`: başlıklar gerçek, gövde iskelet — veri gelince düzen zıplamaz.
 */
export function SectionTable({
  columns,
  rows,
  empty,
  emptyHint = "Kayıt oluştuğunda bu alanda listelenecektir.",
  emptyAction,
  flush = false,
  loading = false,
}: {
  columns: SectionColumn[];
  rows: ReactNode[][];
  /** Boş durum başlığı; resmî ve bağlamlı yazılır ("Kargo kaydı bulunmamaktadır"). */
  empty: string;
  emptyHint?: string;
  /** Boş durumda birincil eylem (ör. "İlk kampüsü ekle"). */
  emptyAction?: ReactNode;
  /** Çerçeveli bir kartın içinde: kendi çerçevesi/köşesi çizilmez (kart içinde kart olmasın). */
  flush?: boolean;
  loading?: boolean;
}) {
  if (!loading && !rows.length) return <EmptyState title={empty} description={emptyHint} action={emptyAction} />;
  const specs = columns.map((column) => (typeof column === "string" ? { label: column, align: column === "" ? "right" : "left" } : { align: "left", ...column }));
  return (
    <div className={cn("overflow-x-auto", flush ? "rounded-lg ring-1 ring-border" : "rounded-lg border border-border")}>
      {loading ? <SkeletonStatus label="Kayıtlar yükleniyor" /> : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-neutral-50">
            {specs.map((column, index) => (
              <th
                key={`${column.label}-${index}`}
                scope="col"
                className={cn(
                  "px-3.5 py-2.5 text-[11.5px] font-semibold tracking-wide whitespace-nowrap text-fg-subtle",
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
                    <td key={col} className="px-3.5 py-3.5">
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
                        "px-3.5 py-3 align-middle",
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

/**
 * Bölüm tablosunun üst şeridi: solda kayıt sayısı ("12 kampüs"), sağda eylemler.
 * Tek başına sağa itilmiş buton yerine; kullanıcı neye baktığını ve kaç kayıt olduğunu görür.
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-fg-muted">
        {loading || count == null ? (
          <Skeleton className="h-4 w-20" />
        ) : (
          <>
            <span className="numeric font-semibold text-fg">{count.toLocaleString("tr-TR")}</span> {noun}
          </>
        )}
      </p>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
