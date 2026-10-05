"use client";

import { useListExams } from "@/src/api/generated/admin-exams/admin-exams";
import type { ExamSummaryDto } from "@/src/api/generated/models";
import { GrantDialog } from "@/src/features/assignments/GrantDialog";
import { purposeLabel } from "@/src/features/authoring/exams/ExamPages";
import { Button, ButtonLink, DataGrid, ErrorState, IconSearch, Input, PageHeader, Select, type GridColDef } from "@/src/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const PURPOSE_OPTIONS = [
  { value: "ACHIEVEMENT", label: "Başarı" },
  { value: "PLACEMENT", label: "Seviye tespit" },
  { value: "DIAGNOSTIC", label: "Tanılama" },
  { value: "PRACTICE", label: "Alıştırma" },
];

export default function AdminExamsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useListExams({ status: "PUBLISHED" });
  const rows = useMemo(() => data?.data ?? [], [data]);
  const [grant, setGrant] = useState<{ open: boolean; exam: ExamSummaryDto | null }>({ open: false, exam: null });
  const [query, setQuery] = useState("");
  const [purpose, setPurpose] = useState("");

  const term = query.trim().toLocaleLowerCase("tr-TR");
  const shown = rows.filter(
    (r) =>
      (!purpose || r.purpose === purpose) &&
      (!term || `${r.title ?? ""} ${r.code ?? ""} ${r.shortDescription ?? ""}`.toLocaleLowerCase("tr-TR").includes(term)),
  );

  const columns = useMemo<GridColDef<ExamSummaryDto>[]>(
    () => [
      {
        field: "title",
        headerName: "Sınav",
        minWidth: 280,
        renderCell: ({ row }) => (
          <div className="flex items-center gap-3 py-0.5">
            <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--accent-teal-bg) text-(--accent-teal)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 4h8l3 3v13H5V4h3ZM9 10h6M9 14h6M9 18h3" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-fg">{row.title}</p>
              <p className="truncate text-xs text-fg-subtle">
                <span className="font-mono">{row.code}</span> · Sürüm {row.versionNumber}
                {row.shortDescription ? ` · ${row.shortDescription}` : ""}
              </p>
            </div>
          </div>
        ),
      },
      {
        field: "minLevel",
        headerName: "Seviye",
        width: 110,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) =>
          row.minLevel ? (
            <span className="rounded bg-(--accent-plum-bg) px-1.5 py-0.5 font-mono text-xs font-semibold text-(--accent-plum)">
              {row.minLevel === row.maxLevel ? row.minLevel : `${row.minLevel}–${row.maxLevel}`}
            </span>
          ) : (
            "—"
          ),
      },
      {
        field: "purpose",
        headerName: "Amaç",
        width: 140,
        renderCell: ({ row }) =>
          row.purpose ? <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-fg-muted">{purposeLabel(row.purpose)}</span> : "—",
      },
      {
        field: "publishedAt",
        headerName: "Yayın tarihi",
        width: 130,
        valueGetter: (_v, row) => (row.publishedAt ? new Date(row.publishedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "—"),
      },
      {
        field: "actions",
        headerName: "",
        width: 150,
        sortable: false,
        align: "right",
        headerAlign: "right",
        renderCell: ({ row }) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              event.stopPropagation();
              setGrant({ open: true, exam: row });
            }}
          >
            + Lisans ver
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Lisanslar"
        description="Yayınlanmış katalog sınavlarını kurumlara lisanslayın. Lisans verilen sınavı kurum kendi sınıflarına atayıp uygulayabilir; bir kurumun mevcut lisansları kurum detayındaki “Lisanslı sınavlar” sekmesindedir."
        count={isLoading ? undefined : rows.length}
        actions={
          <Button onClick={() => setGrant({ open: true, exam: null })} disabled={rows.length === 0}>
            + Lisans ver
          </Button>
        }
      />

      <ol className="grid gap-2 text-[13px] sm:grid-cols-3" aria-label="Lisans süreci">
        {[
          { n: 1, t: "Sınav yayınlanır", d: "İçerik › Sınavlar'da hazırlanıp yayınlanır." },
          { n: 2, t: "Kuruma lisans verilir", d: "Sınav + kurum + sezon + kota seçilir." },
          { n: 3, t: "Kurum atar", d: "Kurum personeli sınavı sınıflarına atar." },
        ].map((s) => (
          <li key={s.n} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">{s.n}</span>
            <span>
              <span className="block font-medium text-fg">{s.t}</span>
              <span className="block text-xs text-fg-subtle">{s.d}</span>
            </span>
          </li>
        ))}
      </ol>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <section className="rounded-xl border border-border bg-surface shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <p className="text-[13px] text-fg-muted">
              <span className="font-semibold text-fg tabular-nums">{shown.length}</span> yayınlı sınav
              {term || purpose ? (
                <button type="button" className="ml-2 font-medium text-primary hover:underline" onClick={() => { setQuery(""); setPurpose(""); }}>
                  Filtreleri temizle
                </button>
              ) : null}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="sm:w-40">
                <Select value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="Amaç filtresi">
                  <option value="">Tüm amaçlar</option>
                  {PURPOSE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </Select>
              </div>
              <div className="sm:w-64">
                <Input type="search" icon={<IconSearch />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sınav adı veya kodu ara" aria-label="Sınav ara" />
              </div>
            </div>
          </div>
          <DataGrid
            rows={shown}
            columns={columns}
            getRowId={(row) => row.id!}
            loading={isLoading}
            embedded
            emptyState={{
              title: rows.length ? "Eşleşen sınav yok" : "Yayınlı sınav yok",
              description: rows.length ? "Aramayı ya da amaç filtresini değiştirin." : "Lisans verebilmek için önce İçerik › Sınavlar bölümünde bir sınav hazırlayıp yayınlayın.",
              action: rows.length ? undefined : <ButtonLink href="/admin/content/exams">Sınavlara git</ButtonLink>,
            }}
            hideFooter={shown.length <= 20}
          />
        </section>
      )}

      <p className="text-xs text-fg-subtle">
        Taslak veya incelemedeki sınavlar burada görünmez.{" "}
        <Link href="/admin/content/exams" className="font-medium text-primary hover:underline">Tüm sınavlar →</Link>
      </p>

      <GrantDialog
        open={grant.open}
        examId={grant.exam?.id}
        onClose={() => setGrant({ open: false, exam: null })}
        onGranted={(companyId) => router.push(`/admin/companies/${companyId}/grants`)}
      />
    </div>
  );
}
