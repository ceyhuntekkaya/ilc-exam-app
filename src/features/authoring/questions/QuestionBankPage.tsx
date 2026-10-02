"use client";

import { authoringApi, type QuestionSummary } from "@/src/features/authoring/shared/client";
import { StatusBadge } from "@/src/features/authoring/shared/StatusBadge";
import { useAuthoringTenant } from "@/src/features/authoring/shared/tenant";
import {
  Button,
  ButtonLink,
  DataGrid,
  ErrorState,
  PageHeader,
  Select,
  type GridColDef,
} from "@/src/ui";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export function QuestionBankPage({ basePath }: { basePath: string }) {
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
        width: 120,
        renderCell: ({ row }) => (
          <Link href={`${basePath}/${row.versionId}`} className="font-medium text-primary hover:underline">
            {row.code || "—"}
          </Link>
        ),
      },
      {
        field: "primaryType",
        headerName: "Tip",
        minWidth: 160,
        renderCell: ({ row }) => row.primaryType?.replaceAll("_", " ") ?? "—",
      },
      {
        field: "primarySkill",
        headerName: "Beceri",
        width: 120,
        renderCell: ({ row }) => row.primarySkill ?? "—",
      },
      {
        field: "cefrLevel",
        headerName: "Seviye",
        width: 90,
        renderCell: ({ row }) => row.cefrLevel ?? "—",
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => <StatusBadge status={row.status} />,
      },
      {
        field: "versionNo",
        headerName: "Sürüm",
        width: 80,
        renderCell: ({ row }) => `v${row.versionNo}`,
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
      window.location.href = `${basePath}/${q.versionId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Oluşturulamadı");
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
          <Button onClick={() => void create()} disabled={creating || !tenant}>
            {creating ? "Oluşturuluyor…" : "Yeni soru"}
          </Button>
        }
      />
      <div className="rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Durum filtresi"
          >
            <option value="">Tüm durumlar</option>
            <option value="DRAFT">Taslak</option>
            <option value="IN_REVIEW">İncelemede</option>
            <option value="APPROVED">Onaylı</option>
            <option value="RETIRED">Emekli</option>
          </Select>
          <ButtonLink href={`${basePath}/new`} variant="secondary">
            Tip seçerek başla
          </ButtonLink>
        </div>
        {tenantLoading || loading ? (
          <div className="p-8 text-sm text-fg-muted">Yükleniyor…</div>
        ) : error ? (
          <div className="p-4">
            <ErrorState title="Soru listesi alınamadı" message={error} />
          </div>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(r) => r.versionId}
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
