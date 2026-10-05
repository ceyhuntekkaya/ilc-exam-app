"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useList } from "@/src/api/generated/admin-companies/admin-companies";
import type { CompanySummary } from "@/src/api/generated/models";
import { CompanySummaryStatus } from "@/src/api/generated/models";
import { companyStatusLabel, companyStatusTone } from "@/src/features/admin/labels";
import {
  Badge,
  ButtonLink,
  CountBadge,
  DataGrid,
  ErrorState,
  FilterTabs,
  IconSearch,
  Input,
  PageHeader,
  type GridColDef,
} from "@/src/ui";

const STATUS_TABS: { label: string; value: string | null }[] = [
  { label: "Tümü", value: null },
  { label: "Aktif", value: CompanySummaryStatus.ACTIVE },
  { label: "Askıda", value: CompanySummaryStatus.SUSPENDED },
  { label: "Pasif", value: CompanySummaryStatus.PASSIVE },
];

export default function AdminCompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status");
  const page = Number(searchParams.get("page") ?? "0") || 0;

  const { data, isLoading, isError, error } = useList({
    q: q || undefined,
    status: (status as CompanySummary["status"] | null) ?? undefined,
    page,
    size: 20,
  });

  const pageData = data?.data;
  const rows = pageData?.content ?? [];

  const columns = useMemo<GridColDef<CompanySummary>[]>(
    () => [
      {
        field: "name",
        headerName: "Kurum",
        minWidth: 220,
        renderCell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.logoUrl} alt="" className="size-9 shrink-0 rounded-lg bg-surface object-contain ring-1 ring-border" />
            ) : (
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-[13px] font-bold text-primary ring-1 ring-primary-100"
              >
                {(row.name ?? "?").trim().slice(0, 2).toLocaleUpperCase("tr-TR")}
              </span>
            )}
            <div className="min-w-0">
              <Link href={`/admin/companies/${row.id}`} className="font-medium text-fg hover:text-primary">
                {row.name}
              </Link>
              <p className="font-mono text-xs text-fg-subtle">{row.code}</p>
            </div>
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => (
          <Badge tone={companyStatusTone(row.status)} dot>
            {companyStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        field: "createdAt",
        headerName: "Oluşturulma",
        width: 140,
        valueGetter: (_v, row) =>
          row.createdAt ? new Date(row.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "—",
      },
    ],
    [],
  );

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    router.push(`/admin/companies?${next.toString()}`);
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Kurumlar"
        description="Platformdaki okul ve kurumlar. Bir kuruma tıklayarak üyeliğini, kampüslerini, personelini, öğrencilerini ve sınav lisanslarını yönetin."
        count={pageData?.totalElements}
        countSlot={
          pageData?.totalElements != null ? <CountBadge count={pageData.totalElements} /> : undefined
        }
        actions={<ButtonLink href="/admin/companies/new">Yeni kurum</ButtonLink>}
      />

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col-reverse gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <FilterTabs
            label="Kurum durumu"
            items={STATUS_TABS}
            value={status ?? null}
            onChange={(value) => setParam("status", value)}
          />
          <form
            className="w-full px-3 pt-3 sm:max-w-xs sm:py-2 sm:pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setParam("q", String(form.get("q") || "") || null);
            }}
          >
            <Input key={q} name="q" type="search" icon={<IconSearch />} defaultValue={q} placeholder="Kurum adı veya kodu ara (Enter)" aria-label="Kurum ara" />
          </form>
        </div>

        {q ? (
          <p className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-50/40 px-4 py-2 text-[13px] text-fg-muted">
            <span>
              “<span className="font-medium text-fg">{q}</span>” için{" "}
              {pageData?.totalElements != null ? <span className="font-semibold text-fg tabular-nums">{pageData.totalElements}</span> : "…"} sonuç
            </span>
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => setParam("q", null)}>
              Aramayı temizle
            </button>
          </p>
        ) : null}
        {isError ? (
          <div className="p-4">
            <ErrorState error={error} compact />
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id!}
            loading={isLoading}
            emptyState={{
              title: q || status ? "Sonuç yok" : "Henüz kurum yok",
              description: q || status
                ? "Filtreleri temizleyip yeniden deneyin."
                : "İlk kurumu oluşturarak başlayın.",
              action:
                !q && !status ? (
                  <ButtonLink href="/admin/companies/new">Yeni kurum</ButtonLink>
                ) : undefined,
            }}
            onRowClick={({ row }) => router.push(`/admin/companies/${row.id}`)}
            pageSize={20}
            paginationMode="server"
            rowCount={pageData?.totalElements ?? 0}
            page={page}
            onPaginationModelChange={(model) => setParam("page", String(model.page))}
            embedded
          />
        )}
      </div>
    </div>
  );
}
