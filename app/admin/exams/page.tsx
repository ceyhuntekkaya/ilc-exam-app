"use client";

import { useListExams } from "@/src/api/generated/admin-exams/admin-exams";
import type { ExamSummaryDto } from "@/src/api/generated/models";
import { examStatusLabel } from "@/src/features/admin/labels";
import { GrantDialog } from "@/src/features/assignments/GrantDialog";
import { Badge, Button, DataGrid, ErrorState, PageHeader, type GridColDef } from "@/src/ui";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function AdminExamsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useListExams({ status: "PUBLISHED" });
  const rows = data?.data ?? [];
  const [grantExam, setGrantExam] = useState<ExamSummaryDto | null>(null);

  const columns = useMemo<GridColDef<ExamSummaryDto>[]>(
    () => [
      {
        field: "title",
        headerName: "Sınav",
        minWidth: 240,
        renderCell: ({ row }) => (
          <div>
            <p className="font-medium text-fg">{row.title}</p>
            <p className="text-xs text-fg-muted">
              {row.code} · v{row.versionNumber}
            </p>
          </div>
        ),
      },
      {
        field: "status",
        headerName: "Durum",
        width: 120,
        renderCell: ({ row }) => (
          <Badge tone="success" dot>
            {examStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        field: "purpose",
        headerName: "Amaç",
        width: 120,
        valueGetter: (_v, row) => row.purpose ?? "—",
      },
      {
        field: "actions",
        headerName: "",
        width: 140,
        renderCell: ({ row }) => (
          <Button size="sm" variant="secondary" onClick={() => setGrantExam(row)}>
            Lisans ver
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Sınavlar"
        description="Yayınlanmış katalog sınavlarını görüntüleyin ve okullara lisans verin."
        count={rows.length}
      />

      {isError ? (
        <ErrorState message={error instanceof Error ? error.message : "Liste yüklenemedi"} />
      ) : (
        <div className="rounded-xl border border-border bg-surface shadow-sm">
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id!}
            loading={isLoading}
            embedded
            emptyState={{
              title: "Yayınlı sınav yok",
              description: "Önce bir sınav yayınlanmalı.",
            }}
            hideFooter={rows.length <= 20}
          />
        </div>
      )}

      <GrantDialog
        open={grantExam != null}
        examId={grantExam?.id}
        onClose={() => setGrantExam(null)}
        onGranted={(companyId) => router.push(`/admin/companies/${companyId}/grants`)}
      />
    </div>
  );
}
