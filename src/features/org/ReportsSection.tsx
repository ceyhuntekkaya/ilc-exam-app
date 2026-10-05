"use client";

import { useExamReports } from "@/src/api/generated/admin-companies/admin-companies";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { Badge, ErrorState, SectionTable } from "@/src/ui";

export function ReportsSection({ companyId }: { companyId: string }) {
  const id = companyId;
  const { data, isLoading, isError, error } = useExamReports(id);
  const rows = data?.data ?? [];

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <SectionTable
      flush
      empty="Rapor yok"
      emptyHint="Atama oluştukça uygulama özetleri burada listelenir."
      columns={[
        "Durum",
        { label: "Alıcı", align: "right" },
        { label: "Devam", align: "right" },
        { label: "Tamam", align: "right" },
        { label: "Girmedi", align: "right" },
        { label: "Yayınlı sonuç", align: "right" },
      ]}
      rows={rows.map((r) => [
        <Badge
          key="s"
          tone={r.status === "OPEN" ? "success" : r.status === "CLOSED" ? "neutral" : "info"}
          dot
        >
          {assignmentStatusLabel(r.status)}
        </Badge>,
        String(r.recipientsTotal ?? 0),
        String(r.recipientsInProgress ?? 0),
        String(r.recipientsCompleted ?? 0),
        String(r.recipientsAbsent ?? 0),
        String(r.resultsPublished ?? 0),
      ])}
    />
  );
}
