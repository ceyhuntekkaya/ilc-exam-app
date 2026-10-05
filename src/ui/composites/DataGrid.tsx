"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/src/lib/utils/cn";
import { Input } from "@/src/ui/primitives/Input";
import { Select } from "@/src/ui/primitives/Select";

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const CHEVRONS = "M8 9l4-4 4 4M8 15l4 4 4-4";
const CHEVRON_UP = "M6 14l6-6 6 6";
const CHEVRON_DOWN = "M6 10l6 6 6-6";
const CHEVRON_LEFT = "M14 6l-6 6 6 6";
const CHEVRON_RIGHT = "M10 6l6 6-6 6";
const SEARCH = "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-5-5";
const DATABASE = "M4 7c0-2 3.6-4 8-4s8 2 8 4-3.6 4-8 4-8-2-8-4Zm16 5c0 2-3.6 4-8 4s-8-2-8-4M4 7v10c0 2 3.6 4 8 4s8-2 8-4V7";

function setBodyResizeCursor(active: boolean) {
  document.body.style.cursor = active ? "col-resize" : "";
  document.body.style.userSelect = active ? "none" : "";
}

export interface GridColDef<T = Record<string, unknown>> {
  field: keyof T | string;
  headerName: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  description?: string;
  valueGetter?: (value: unknown, row: T) => unknown;
  renderCell?: (params: { value: unknown; row: T; field: string }) => ReactNode;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
}

export type LoadingState = boolean | { type: "skeleton" | "overlay" | "spinner"; message?: string };

export interface EmptyStateConfig {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export interface PaginationModel {
  page: number;
  pageSize: number;
}

export interface DataGridProps<T = Record<string, unknown>> {
  rows: T[];
  columns: GridColDef<T>[];
  getRowId?: (row: T) => string;
  pageSize?: number;
  pageSizeOptions?: number[];
  checkboxSelection?: boolean;
  disableRowSelectionOnClick?: boolean;
  onRowSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (params: { row: T; event: React.MouseEvent }) => void;
  loading?: LoadingState;
  emptyState?: EmptyStateConfig;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  hideFooter?: boolean;
  toolbar?: ReactNode;
  /** Kartı üst bileşen çiziyorsa (sekme/filtre şeridi dışarıda): kenarlık, köşe ve gölge verilmez. */
  embedded?: boolean;
  /** Araç çubuğunun üstünde, kenara yaslı sekme satırı (ör. durum sekmeleri). */
  tabs?: ReactNode;
  search?: {
    enabled?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
  };
  paginationMode?: "client" | "server";
  rowCount?: number;
  page?: number;
  onPaginationModelChange?: (model: PaginationModel) => void;
}

function asRecord(row: object): Record<string, unknown> {
  return row as Record<string, unknown>;
}

function textOf(value: unknown): string {
  if (value == null || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

function SortIcon({ field, sortField, direction }: { field: string; sortField: string; direction: "asc" | "desc" | null }) {
  // Sıralanmamış sütunda ikon yalnız başlığın üzerine gelince görünür; başlıklar sade kalır.
  if (sortField !== field || !direction) return <Icon d={CHEVRONS} className="h-3.5 w-3.5 text-fg-subtle opacity-0 transition-opacity group-hover/th:opacity-100" />;
  return direction === "asc" ? (
    <Icon d={CHEVRON_UP} className="h-3.5 w-3.5 text-primary" />
  ) : (
    <Icon d={CHEVRON_DOWN} className="h-3.5 w-3.5 text-primary" />
  );
}

export function DataGrid<T extends object>({
  rows,
  columns,
  getRowId,
  pageSize = 50,
  pageSizeOptions = [5, 10, 25, 50],
  checkboxSelection = false,
  disableRowSelectionOnClick = false,
  onRowSelectionChange,
  onRowClick,
  loading = false,
  emptyState,
  className,
  rowClassName,
  hideFooter = false,
  toolbar,
  tabs,
  embedded = false,
  search,
  paginationMode = "client",
  rowCount,
  page: pageProp,
  onPaginationModelChange,
}: DataGridProps<T>) {
  const [pagination, setPagination] = useState({ page: pageProp ?? 0, pageSize });
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [internalSearch, setInternalSearch] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((col) => [String(col.field), col.width ?? col.minWidth ?? 140])),
  );
  const resizingRef = useRef<{ field: string; startX: number; startWidth: number } | null>(null);
  const getRowIdRef = useRef(getRowId);
  getRowIdRef.current = getRowId;
  const onRowSelectionChangeRef = useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;
  const lastSelectionKeyRef = useRef<string | null>(null);

  const searchQuery = search?.value ?? internalSearch;
  const isServer = paginationMode === "server";
  const currentPage = pageProp ?? pagination.page;
  const currentPageSize = pagination.pageSize;

  const resolveRowId = useCallback((row: T, index: number) => {
    const custom = getRowIdRef.current;
    if (custom) return custom(row);
    const id = asRecord(row).id;
    return id != null ? String(id) : String(index);
  }, []);

  const columnsWidthKey = columns.map((col) => `${String(col.field)}:${col.width ?? ""}:${col.minWidth ?? ""}`).join("|");
  const [syncedColumnsWidthKey, setSyncedColumnsWidthKey] = useState(columnsWidthKey);
  if (syncedColumnsWidthKey !== columnsWidthKey) {
    setSyncedColumnsWidthKey(columnsWidthKey);
    setColumnWidths(Object.fromEntries(columns.map((col) => [String(col.field), col.width ?? col.minWidth ?? 140])));
  }

  if (pageProp != null && pageProp !== pagination.page) {
    setPagination((prev) => (prev.page === pageProp ? prev : { ...prev, page: pageProp }));
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      const { field, startX, startWidth } = resizingRef.current;
      setColumnWidths((prev) => ({ ...prev, [field]: Math.max(72, startWidth + event.clientX - startX) }));
    };
    const onMouseUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      setBodyResizeCursor(false);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const isLoading = typeof loading === "boolean" ? loading : Boolean(loading);
  const loadingConfig = typeof loading === "boolean" ? { type: "skeleton" as const, message: "Veriler yükleniyor..." } : loading;
  const showSkeleton = isLoading && loadingConfig.type === "skeleton";
  const showOverlay = isLoading && loadingConfig.type === "overlay";

  const getCellValue = useCallback((row: T, col: GridColDef<T>) => {
    const raw = asRecord(row)[String(col.field)];
    return col.valueGetter ? col.valueGetter(raw, row) : raw;
  }, []);

  const filteredRows = useMemo(() => {
    if (isServer || !search || search.enabled === false || !searchQuery.trim()) return rows;
    const query = searchQuery.toLocaleLowerCase("tr-TR");
    return rows.filter((row) =>
      columns.some((col) => textOf(getCellValue(row, col)).toLocaleLowerCase("tr-TR").includes(query)),
    );
  }, [rows, search, searchQuery, isServer, columns, getCellValue]);

  const processed = useMemo(() => {
    if (isServer) {
      const total = rowCount ?? rows.length;
      return { data: rows, total, totalPages: Math.max(1, Math.ceil(total / currentPageSize) || 1) };
    }
    const sorted = [...filteredRows];
    if (sortField && sortDirection) {
      const col = columns.find((item) => String(item.field) === sortField);
      sorted.sort((a, b) => {
        const av = col ? getCellValue(a, col) : asRecord(a)[sortField];
        const bv = col ? getCellValue(b, col) : asRecord(b)[sortField];
        const left = textOf(av);
        const right = textOf(bv);
        if (!left) return 1;
        if (!right) return -1;
        const cmp = left.localeCompare(right, "tr", { numeric: true });
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }
    const start = currentPage * currentPageSize;
    return {
      data: sorted.slice(start, start + currentPageSize),
      total: filteredRows.length,
      totalPages: Math.ceil(filteredRows.length / currentPageSize) || 1,
    };
  }, [filteredRows, sortField, sortDirection, currentPage, currentPageSize, isServer, rows, rowCount, columns, getCellValue]);

  const emitPagination = (next: { page: number; pageSize: number }) => {
    setPagination(next);
    onPaginationModelChange?.(next);
  };

  const handleSort = (field: string) => {
    const col = columns.find((item) => String(item.field) === field);
    if (col?.sortable === false) return;
    if (sortField === field && sortDirection === "asc") setSortDirection("desc");
    else if (sortField === field && sortDirection === "desc") {
      setSortField("");
      setSortDirection(null);
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    const next = rows.filter((row, index) => selectedRows.has(resolveRowId(row, index)));
    const key = next.map((row, index) => resolveRowId(row, index)).join("\0");
    if (lastSelectionKeyRef.current === key) return;
    lastSelectionKeyRef.current = key;
    onRowSelectionChangeRef.current?.(next);
  }, [selectedRows, rows, resolveRowId]);

  const handleRowSelection = (rowId: string, selected: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (selected) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedRows(selected ? new Set(rows.map((row, index) => resolveRowId(row, index))) : new Set());
  };

  const renderCellContent = (row: T, col: GridColDef<T>) => {
    const value = getCellValue(row, col);
    if (col.renderCell) return col.renderCell({ value, row, field: String(col.field) });
    return textOf(value);
  };

  const tableMinWidth = columns.reduce((sum, col) => sum + (columnWidths[String(col.field)] ?? col.width ?? 140), checkboxSelection ? 48 : 0);
  const isEmpty = !isLoading && processed.total === 0;
  const searchEnabled = Boolean(search && search.enabled !== false);
  const start = processed.total === 0 ? 0 : currentPage * currentPageSize + 1;
  const end = Math.min((currentPage + 1) * currentPageSize, processed.total);
  const atStart = currentPage === 0;
  const atEnd = processed.totalPages === 0 || currentPage >= processed.totalPages - 1;

  if (showSkeleton) {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-border bg-surface", className)}>
        <div className="flex gap-4 border-b border-border bg-bg px-4 py-3">
          {columns.map((col) => (
            <div key={String(col.field)} className="h-3 animate-pulse rounded bg-neutral-200" style={{ width: 88 }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex gap-4 border-b border-border px-4 py-3.5 last:border-b-0">
            {columns.map((col) => (
              <div key={String(col.field)} className="h-3.5 animate-pulse rounded bg-neutral-100" style={{ width: 80 + ((index * 13) % 40) }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const pagerButton = "flex size-8 items-center justify-center rounded-md border border-border bg-surface text-fg-muted transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40";

  const searchBox = searchEnabled ? (
    <Input
      variant="admin"
      type="search"
      aria-label={search?.placeholder ?? "Tabloda ara"}
      value={searchQuery}
      onChange={(event) => {
        const value = event.target.value;
        if (search?.onChange) search.onChange(value);
        else setInternalSearch(value);
        emitPagination({ page: 0, pageSize: currentPageSize });
      }}
      placeholder={search?.placeholder ?? "Ara..."}
      icon={<Icon d={SEARCH} />}
    />
  ) : null;
  // Sekme varken ve ayrı araç çubuğu yokken arama sekme satırının sağında (AdminList'teki sunucu filtresiyle aynı yerleşim).
  const searchInTabs = Boolean(tabs && !toolbar && searchBox);

  return (
    // overflow-hidden yok: araç çubuğundaki açılır listeler kartın dışına taşabilsin. Köşeleri ilk/son çocuk yuvarlar.
    <div
      className={cn(
        "relative flex flex-col",
        embedded ? null : "rounded-xl border border-border bg-surface shadow-sm [&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl",
        className,
      )}
    >
      {tabs ? (
        searchInTabs ? (
          <div className="flex flex-col-reverse border-b border-border sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0 sm:flex-1">{tabs}</div>
            <div className="shrink-0 px-4 pt-3 sm:w-72 sm:py-1.5 sm:pt-1.5 sm:pl-0 sm:box-content">{searchBox}</div>
          </div>
        ) : (
          <div className="border-b border-border">{tabs}</div>
        )
      ) : null}
      {!searchInTabs && (toolbar || searchBox) && (
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {searchBox ? <div className="w-full shrink-0 sm:max-w-64">{searchBox}</div> : null}
        </div>
      )}

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 ring-8 ring-primary-50/50">
            <Icon d={DATABASE} className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-fg">
            {rows.length > 0 ? "Aramanızla eşleşen kayıt bulunamadı" : (emptyState?.title ?? "Kayıt bulunmamaktadır")}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-fg-muted">
            {rows.length > 0 ? "Lütfen farklı bir arama terimi deneyiniz." : (emptyState?.description ?? "Kayıt oluştuğunda burada listelenecektir.")}
          </p>
          {emptyState?.action ? <div className="mt-5">{emptyState.action}</div> : null}
        </div>
      ) : isMobile ? (
        // Mobil: her satır bir kart; ilk sütun başlık, kalanlar etiket–değer satırları.
        <ul className="divide-y divide-border">
          {processed.data.map((row, index) => {
            const id = resolveRowId(row, index);
            const [mainCol, ...rest] = columns;
            return (
              <li
                key={id}
                onClick={(event) => onRowClick?.({ row, event })}
                className={cn("px-4 py-3", onRowClick && "cursor-pointer active:bg-bg")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-semibold text-fg">{mainCol ? renderCellContent(row, mainCol) : null}</div>
                  {onRowClick ? <Icon d={CHEVRON_RIGHT} className="size-4 shrink-0 text-fg-subtle" /> : null}
                </div>
                <dl className="mt-1.5 grid gap-1">
                  {rest.map((col) => (
                    <div key={String(col.field)} className="flex items-center justify-between gap-3 text-sm">
                      <dt className="shrink-0 text-fg-subtle">{col.headerName}</dt>
                      <dd className="min-w-0 truncate text-right text-fg-muted">{renderCellContent(row, col)}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: tableMinWidth }}>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-neutral-50">
                {checkboxSelection ? (
                  <th className="w-12 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === rows.length && rows.length > 0}
                      onChange={(event) => handleSelectAll(event.target.checked)}
                      className="size-4 accent-primary-600"
                      aria-label="Tümünü seç"
                    />
                  </th>
                ) : null}
                {columns.map((col) => (
                  <th
                    key={String(col.field)}
                    onClick={() => col.sortable !== false && handleSort(String(col.field))}
                    title={col.description ?? col.headerName}
                    aria-sort={sortField === String(col.field) && sortDirection ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "group/th relative px-4 py-2.5 text-[11.5px] font-semibold tracking-wide whitespace-nowrap text-fg-subtle select-none",
                      col.sortable !== false && "cursor-pointer hover:text-fg",
                    )}
                    style={{ textAlign: col.headerAlign ?? "left", width: columnWidths[String(col.field)] }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.headerName}
                      {col.sortable !== false ? <SortIcon field={String(col.field)} sortField={sortField} direction={sortDirection} /> : null}
                    </span>
                    <span
                      className="group/resize absolute inset-y-0 right-0 z-10 flex w-3 cursor-col-resize items-center justify-center"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        resizingRef.current = {
                          field: String(col.field),
                          startX: event.clientX,
                          startWidth: columnWidths[String(col.field)] ?? 140,
                        };
                        setBodyResizeCursor(true);
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <span className="h-4 w-px rounded-full bg-border-strong opacity-0 transition-opacity group-hover/th:opacity-100 group-hover/resize:w-0.5 group-hover/resize:bg-primary-500" />
                    </span>
                  </th>
                ))}
                {onRowClick ? <th className="w-10" aria-hidden /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processed.data.map((row, index) => {
                const id = resolveRowId(row, index);
                const selected = selectedRows.has(id);
                return (
                  <tr
                    key={id}
                    onClick={(event) => {
                      if (!disableRowSelectionOnClick && checkboxSelection) handleRowSelection(id, !selected);
                      onRowClick?.({ row, event });
                    }}
                    className={cn(
                      "group/row transition-colors",
                      selected ? "bg-primary-50" : "hover:bg-primary-50/40",
                      (checkboxSelection || onRowClick) && "cursor-pointer",
                      rowClassName?.(row, index),
                    )}
                  >
                    {checkboxSelection ? (
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => handleRowSelection(id, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                          className="size-4 accent-primary-600"
                          aria-label="Satırı seç"
                        />
                      </td>
                    ) : null}
                    {columns.map((col, colIndex) => (
                      <td
                        key={String(col.field)}
                        className={cn(
                          "overflow-hidden px-4 py-3 text-sm",
                          // İlk sütun kaydın adı: öne çıkar, tıklanabilir satırda hover'da marka rengine döner.
                          colIndex === 0 ? "font-medium text-fg" : "text-fg-muted",
                          colIndex === 0 && onRowClick && "group-hover/row:text-primary",
                        )}
                        style={{ textAlign: col.align ?? "left", maxWidth: columnWidths[String(col.field)] }}
                      >
                        {col.renderCell ? renderCellContent(row, col) : <span className="block truncate">{renderCellContent(row, col)}</span>}
                      </td>
                    ))}
                    {onRowClick ? (
                      <td className="w-10 pr-3 text-right" aria-hidden>
                        <Icon d={CHEVRON_RIGHT} className="ml-auto size-4 text-fg-subtle/60 transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary" />
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!hideFooter && !isEmpty ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-2.5 text-sm">
          <label className="flex items-center gap-2 text-fg-muted">
            <span className="hidden sm:inline">Sayfa başına</span>
            <span className="sr-only sm:hidden">Sayfa başına</span>
            <span className="w-18">
              <Select
                variant="admin"
                value={currentPageSize}
                onChange={(event) => emitPagination({ page: 0, pageSize: Number(event.target.value) })}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </Select>
            </span>
          </label>
          <div className="flex items-center gap-3">
            <span className="numeric text-fg-muted">
              <span className="font-semibold text-fg">
                {start}–{end}
              </span>{" "}
              / {processed.total}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={atStart}
                onClick={() => emitPagination({ page: currentPage - 1, pageSize: currentPageSize })}
                className={pagerButton}
                aria-label="Önceki sayfa"
              >
                <Icon d={CHEVRON_LEFT} className="size-4" />
              </button>
              <button
                type="button"
                disabled={atEnd}
                onClick={() => emitPagination({ page: currentPage + 1, pageSize: currentPageSize })}
                className={pagerButton}
                aria-label="Sonraki sayfa"
              >
                <Icon d={CHEVRON_RIGHT} className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showOverlay ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-surface/75 backdrop-blur-sm">
          <div className="size-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <p className="text-sm font-medium text-fg">{loadingConfig.message ?? "Yükleniyor..."}</p>
        </div>
      ) : null}
    </div>
  );
}
