"use client";

import { Perm } from "@/src/lib/permissions";

import { authoringApi, type QuestionSummary } from "@/src/features/authoring/shared/client";
import { SKILL_LABEL } from "@/src/features/authoring/questions/QuestionEditor";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { getTemplate } from "@/src/features/authoring/templates/registry";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import { useCan, useContentBasePath, usePanelRole } from "@/src/features/panel/PanelContext";
import {
  Button,
  ButtonLink,
  DataGrid,
  ErrorState,
  Field,
  FilterTabs,
  Input,
  PageHeader,
  Select,
  errorMessage,
  notify,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export function QuestionBankPage() {
  const canCreate = useCan(Perm.questionCreate);
  const canReview = useCan(Perm.contentReviewManage, Perm.questionEditOwn, Perm.questionEditAll);
  const role = usePanelRole();
  const basePath = useContentBasePath("questions");
  const reviewPath = useContentBasePath("review");
  const router = useRouter();
  const { tenant, loading: tenantLoading } = useAuthoringTenant();
  const [rows, setRows] = useState<QuestionSummary[]>([]);
  const [status, setStatus] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [cefr, setCefr] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authoringApi.listQuestionsPage({
        ...(status ? { status } : {}),
        ...(includeArchived ? { includeArchived: true } : {}),
        ...(query ? { q: query } : {}),
        ...(skill ? { skill } : {}),
        ...(cefr ? { cefr } : {}),
        page,
        size: 20,
      });
      setRows(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [tenant, status, includeArchived, query, skill, cefr, page]);

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
        renderCell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge status={row.status} />
            {row.archived ? (
              <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-fg-muted">Arşiv</span>
            ) : null}
          </span>
        ),
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
        count={total}
        actions={
          canCreate || (role === "STAFF" && canReview) ? (
          <>
            {role === "STAFF" && canReview ? (
              <ButtonLink href={`${reviewPath}?type=Soru`} variant="secondary">
                İnceleme kuyruğu
              </ButtonLink>
            ) : null}
            {canCreate ? (
              <ButtonLink href={`${basePath}/new`} variant="secondary">
                Tip seçerek başla
              </ButtonLink>
            ) : null}
            {canCreate ? (
              <Button onClick={() => void create()} disabled={creating || !tenant}>
                {creating ? "Oluşturuluyor…" : "Hızlı soru"}
              </Button>
            ) : null}
          </>
          ) : undefined
        }
      />
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border">
          <FilterTabs
            label="Soru durumu"
            value={status || null}
            onChange={(value) => { setStatus(value ?? ""); setPage(0); }}
            items={[
              { label: "Tümü", value: null },
              { label: "Taslak", value: "DRAFT" },
              { label: "İncelemede", value: "IN_REVIEW" },
              { label: "Onaylı", value: "APPROVED" },
              { label: "Emekli", value: "RETIRED" },
            ]}
          />
          <div className="px-3 pb-2">
            <Button
              variant="secondary"
              className="min-h-11"
              aria-pressed={includeArchived}
              onClick={() => { setIncludeArchived((current) => !current); setPage(0); }}
            >
              {includeArchived ? "Arşivdekileri gizle" : "Arşivdekileri göster"}
            </Button>
          </div>
          <form
            className="grid gap-3 border-t border-border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_8rem_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              setQuery(draftQuery.trim());
            }}
          >
            <Field label="Ara">
              <Input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Kod veya metin" />
            </Field>
            <Field label="Beceri">
              <Select value={skill} onChange={(event) => { setSkill(event.target.value); setPage(0); }} aria-label="Beceri">
                <option value="">Tümü</option>
                {Object.entries(SKILL_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </Field>
            <Field label="Seviye">
              <Select value={cefr} onChange={(event) => { setCefr(event.target.value); setPage(0); }} aria-label="Seviye">
                <option value="">Tümü</option>
                {["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"].map((level) => <option key={level} value={level}>{level}</option>)}
              </Select>
            </Field>
            <Button type="submit" variant="secondary" className="min-h-11">Ara</Button>
          </form>
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
              action: canCreate ? (
                <Button onClick={() => void create()} disabled={!tenant}>
                  İlk soruyu yaz
                </Button>
              ) : undefined,
            }}
          />
        )}
        {total > 20 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p className="text-sm text-fg-muted">{page * 20 + 1}–{Math.min(total, (page + 1) * 20)} / {total}</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="min-h-11" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>Önceki</Button>
              <Button type="button" variant="secondary" className="min-h-11" disabled={(page + 1) * 20 >= total} onClick={() => setPage((current) => current + 1)}>Sonraki</Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
