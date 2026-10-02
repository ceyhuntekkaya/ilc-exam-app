import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";

/**
 * Yükleme iskeletleri — yalnız verisi çekilen alan için (Suspense fallback'i) ve o alanın gerçek yapısıyla:
 * tablo iskeleti gerçek sütun başlıklarını ve hücre biçimlerini (görsel, iki satır, rozet, sağa yaslı sayı), detay
 * iskeleti bölümün kendi parçalarını (özet kartlar, bilgi listesi, tablo, zaman çizelgesi, görsel ızgarası) taklit eder.
 * Sayfa başlığı/sekmeler/filtreler yerinde kalır. Ekran okuyucuya tek "yükleniyor" durumu; hareket azaltmada nabız durur.
 */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden style={style} className={cn("block animate-pulse rounded-md bg-border/60 motion-reduce:animate-none", className)} />;
}

export function SkeletonStatus({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

/**
 * Tablo sütununun hücre biçimi: "text" düz metin, "sub" iki satır (ad + soluk alt bilgi), "media" küçük görsel + iki satır,
 * "status" durum rozeti, "number" sağa yaslı kısa sayı, "action" satır sonu buton.
 */
export type SkeletonColumn = { label: string; kind?: "text" | "sub" | "media" | "status" | "number" | "action" };

// Satırdan satıra değişen genişlik: bütün satırlar aynı çubuk olmasın, gerçek veri gibi dursun.
const WIDTHS = ["w-3/5", "w-2/5", "w-1/2", "w-2/3", "w-1/3", "w-3/4"];

function Cell({ kind = "text", row, col }: { kind?: SkeletonColumn["kind"]; row: number; col: number }) {
  const width = WIDTHS[(row + col) % WIDTHS.length];
  if (kind === "media") {
    return (
      <span className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0" />
        <span className="grid flex-1 gap-1.5">
          <Skeleton className={cn("h-3.5", width)} />
          <Skeleton className="h-3 w-1/3" />
        </span>
      </span>
    );
  }
  if (kind === "sub") {
    return (
      <span className="grid gap-1.5">
        <Skeleton className={cn("h-3.5", width)} />
        <Skeleton className="h-3 w-2/5" />
      </span>
    );
  }
  if (kind === "status") return <Skeleton className="h-5 w-16 rounded-full" />;
  if (kind === "number") return <Skeleton className="ml-auto h-3.5 w-10" />;
  if (kind === "action") return <Skeleton className="ml-auto h-7 w-16" />;
  return <Skeleton className={cn("h-3.5", width)} />;
}

/** Yalnız tablo gövdesi (başlık satırı gerçek etiketlerle): detay bölümlerindeki SectionTable ve liste tabloları için. */
export function TableBodySkeleton({ columns, rows = 6, bordered = true }: { columns: SkeletonColumn[]; rows?: number; bordered?: boolean }) {
  return (
    <div className={cn("overflow-hidden", bordered && "rounded-lg border border-border")}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-bg">
            {columns.map((column, index) => (
              <th
                key={`${column.label}-${index}`}
                scope="col"
                className={cn("px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-fg-muted", column.kind === "number" || column.kind === "action" ? "text-right" : "text-left")}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((column, col) => (
                <td key={col} className="px-4 py-3.5">
                  <Cell kind={column.kind} row={row} col={col} />
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
 * Liste tablosu kartı (DataGrid düzeni): gerçek sekme/filtre şeridi aynen gösterilir, sütun başlıkları gerçek; yalnız
 * hücreler iskelet. `tabs`: sekme satırı (varsa filtre de içinde), `toolbar`: sekmesiz filtre şeridi.
 */
export function TableSkeleton({
  columns,
  tabs,
  toolbar,
  rows = 8,
  label = "Kayıtlar yükleniyor",
}: {
  columns: SkeletonColumn[];
  tabs?: ReactNode;
  toolbar?: ReactNode;
  rows?: number;
  label?: string;
}) {
  return (
    <div className="relative flex flex-col rounded-xl border border-border bg-surface shadow-sm [&>*:last-child]:rounded-b-xl">
      <SkeletonStatus label={label} />
      {tabs ? <div className="border-b border-border">{tabs}</div> : null}
      {toolbar ? <div className="border-b border-border px-4 py-3">{toolbar}</div> : null}
      <TableBodySkeleton columns={columns} rows={rows} bordered={false} />
    </div>
  );
}

/** Özet kartları (StatGrid düzeni): etiket + büyük değer. */
export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="grid gap-2 rounded-lg border border-border bg-bg/60 px-4 py-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

/** Bilgi listesi (DefinitionList düzeni): küçük etiket + değer, 2–3 sütun. */
export function DefinitionSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="grid gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className={cn("h-4", WIDTHS[index % WIDTHS.length])} />
        </div>
      ))}
    </div>
  );
}

/** Bölüm içi başlıklı blok (Block düzeni): büyük harfli küçük başlık + içerik. */
export function BlockSkeleton({ children, first = false }: { children: ReactNode; first?: boolean }) {
  return (
    <div className={cn("grid gap-3", !first && "border-t border-border pt-5")}>
      <Skeleton className="h-3.5 w-28" />
      {children}
    </div>
  );
}

/** Paragraf metni (açıklama): farklı uzunlukta satırlar. */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn("h-3.5", index === lines - 1 ? "w-2/5" : "w-full")} />
      ))}
    </div>
  );
}

/** Değişiklik geçmişi (AuditTimeline düzeni): sol çizgi, nokta, olay + tarih, durum geçişi. */
export function TimelineSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-5 border-l border-border pl-5">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="relative grid gap-1.5">
          <span aria-hidden className="absolute top-1 -left-6.25 size-2.5 rounded-full bg-border" />
          <div className="flex gap-2">
            <Skeleton className={cn("h-4", index % 2 ? "w-40" : "w-52")} />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Görsel kartları (görsel + sıra + seçim): iki sütun. */
export function MediaListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
          <Skeleton className="size-16 shrink-0" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Form (iki sütun alan + kaydet): özellik formu gibi düzenlenebilir bölümler. */
export function SectionSkeleton({ fields = 6, label }: { fields?: number; label?: string }) {
  return (
    <div className="grid gap-5">
      {label ? <SkeletonStatus label={label} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="grid gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-border pt-4">
        <Skeleton className="h-8 w-36" />
      </div>
    </div>
  );
}
