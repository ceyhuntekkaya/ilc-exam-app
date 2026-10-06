"use client";

import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";

import { authoringApi, type QuestionSummary } from "@/src/features/authoring/shared/client";
import { SKILL_LABEL } from "@/src/features/authoring/questions/QuestionEditor";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useContentBasePath } from "@/src/features/panel/PanelContext";
import {
  Button,
  ButtonLink,
  DataGrid,
  ErrorState,
  FilterTabs,
  PageHeader,
  errorMessage,
  notify,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function QuestionBankPage() {
  const canCreate = useCan(Perm.questionCreate);
  const basePath = useContentBasePath("questions");
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useAuthoringTenant();
  const [rows, setRows] = useState<QuestionSummary[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);
    setError(null);
    try {
      const data = await authoringApi.listQuestions(status ? { status } : undefined);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenant, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo<GridColDef<QuestionSummary>[]>(
    () => [
      {
        field: "code",
        headerName: "Kod",
        width: 160,
        renderCell: ({ row }) => (
          <Link href={`${basePath}/${row.versionId}`} className="font-mono text-[13px] font-medium text-primary hover:underline">
            {row.code ? `${row.code} - v${row.versionNo}` : "—"}
          </Link>
        ),
      },
      {
        field: "primaryType",
        headerName: "Soru tipi",
        minWidth: 180,
        renderCell: ({ row }) => {
          const types =
            row.types && row.types.length > 0
              ? row.types
              : row.primaryType
                ? [row.primaryType]
                : [];
          if (types.length === 0) return "—";
          return (
            <div className="flex flex-col gap-0.5 py-0.5 leading-snug">
              {types.map((t) => (
                <span key={t} className="text-fg">{getTemplate(t)?.label ?? t.replaceAll("_", " ")}</span>
              ))}
            </div>
          );
        },
      },
      {
        field: "tags",
        headerName: "Etiketler",
        minWidth: 180,
        sortable: false,
        renderCell: ({ row }) => {
          const tags = row.tags ?? [];
          if (tags.length === 0) return <span className="text-fg-subtle">—</span>;
          return (
            <div className="flex flex-wrap gap-1 py-0.5">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs text-fg-muted">
                  {tag}
                </span>
              ))}
              {tags.length > 3 ? <span className="px-1 text-xs text-fg-subtle">+{tags.length - 3}</span> : null}
            </div>
          );
        },
      },
      {
        field: "primarySkill",
        headerName: "Beceri",
        width: 130,
        renderCell: ({ row }) =>
          row.primarySkill ? (SKILL_LABEL[row.primarySkill as keyof typeof SKILL_LABEL] ?? row.primarySkill) : "—",
      },
      {
        field: "cefrLevel",
        headerName: "Seviye",
        width: 100,
        align: "center",
        headerAlign: "center",
        renderCell: ({ row }) =>
          row.cefrLevel ? (
            <span className="inline-flex min-w-8 justify-center rounded-md bg-(--accent-plum-bg) px-1.5 py-0.5 font-mono text-xs font-semibold text-(--accent-plum)">
              {row.cefrLevel}
            </span>
          ) : (
            "—"
          ),
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => <StatusBadge status={row.status} />,
      },
    ],
    [basePath],
  );

  async function create() {
    setCreating(true);
    try {
      const q = await authoringApi.createQuestion({
        interactionType: "MULTIPLE_CHOICE",
        skill: "READING",
      });
      router.push(`${basePath}/${q.versionId}`);
    } catch (e) {
      notify.error(errorMessage(e, "Soru oluşturulamadı"));
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Soru Bankası"
        description="Bağımsız sorular ve setler. Kaydedilen her soru bankaya düşer."
        count={rows.length}
        actions={
          canCreate ? (
          <>
            <ButtonLink href={`${basePath}/new`} variant="secondary">
              Tip seçerek başla
            </ButtonLink>
            <Button onClick={() => void create()} disabled={creating || !tenant}>
              {creating ? "Oluşturuluyor…" : "Hızlı soru"}
            </Button>
          </>
          ) : undefined
        }
      />
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border">
          <FilterTabs
            label="Soru durumu"
            value={status || null}
            onChange={(value) => setStatus(value ?? "")}
            items={[
              { label: "Tümü", value: null },
              { label: "Taslak", value: "DRAFT" },
              { label: "İncelemede", value: "IN_REVIEW" },
              { label: "Onaylı", value: "APPROVED" },
              { label: "Emekli", value: "RETIRED" },
            ]}
          />
        </div>
        {error ? (
          <div className="p-4">
            <ErrorState title="Soru listesi alınamadı" message={error} />
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.versionId}
            loading={tenantLoading || loading}
            embedded
            onRowClick={({ row }) => router.push(`${basePath}/${row.versionId}`)}
            emptyState={{
              title: "Henüz soru yok",
              description: "İlk sorunuzu yazarak bankayı besleyin.",
              action: (
                <Button onClick={() => void create()} disabled={!tenant}>
                  İlk soruyu yaz
                </Button>
              ),
            }}
          />
        )}
      </div>
    </div>
  );
}
