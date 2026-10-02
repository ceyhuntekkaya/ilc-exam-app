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
          <div>
            <Link href={`/admin/companies/${row.id}`} className="font-medium text-fg hover:text-primary">
              {row.name}
            </Link>
            <p className="text-xs text-fg-muted">{row.code}</p>
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
          row.createdAt ? new Date(row.createdAt).toLocaleDateString("tr-TR") : "—",
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
        description="Platform üzerindeki kurumları görüntüleyin ve yönetin."
        count={pageData?.totalElements}
        countSlot={
          pageData?.totalElements != null ? <CountBadge count={pageData.totalElements} /> : undefined
        }
        actions={<ButtonLink href="/admin/companies/new">Yeni kurum</ButtonLink>}
      />

      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-col-reverse gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <nav className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const active = (status ?? null) === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setParam("status", tab.value)}
                  className={`h-8 shrink-0 rounded-md px-3 text-[13px] font-medium ${
                    active ? "bg-bg text-fg ring-1 ring-border" : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <form
            className="w-full sm:max-w-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              setParam("q", String(form.get("q") || "") || null);
            }}
          >
            <Input name="q" defaultValue={q} placeholder="Kurum veya kod ara…" />
          </form>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState message={error instanceof Error ? error.message : "Liste yüklenemedi"} />
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
