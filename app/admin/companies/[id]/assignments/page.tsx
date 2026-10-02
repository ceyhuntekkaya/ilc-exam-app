"use client";

import { useParams } from "next/navigation";
import { useListAssignments } from "@/src/api/generated/admin-exams/admin-exams";
import { CompanyDetailFrame } from "@/src/features/admin/CompanyDetailFrame";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { Badge, ErrorState, SectionTable } from "@/src/ui";

export default function CompanyAssignmentsPage() {
  return (
    <CompanyDetailFrame section="assignments">
      <Body />
    </CompanyDetailFrame>
  );
}

function Body() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error } = useListAssignments({ companyId: id });
  const rows = data?.data ?? [];

  if (isError) return <ErrorState message={error instanceof Error ? error.message : "Yüklenemedi"} />;
  if (isLoading) return <div className="h-24 animate-pulse rounded-md bg-neutral-100" />;

  return (
    <SectionTable
      flush
      empty="Atama yok"
      emptyHint="Kurum henüz öğrenciye sınav ataması yapmamış."
      columns={["Durum", "Pencere", "Oluşturulma"]}
      rows={rows.map((r) => [
        <Badge
          key="s"
          tone={r.status === "OPEN" ? "success" : r.status === "CLOSED" ? "neutral" : "info"}
          dot
        >
          {assignmentStatusLabel(r.status)}
        </Badge>,
        `${r.availableFrom ? new Date(r.availableFrom).toLocaleString("tr-TR") : "—"} → ${
          r.availableUntil ? new Date(r.availableUntil).toLocaleString("tr-TR") : "—"
        }`,
        r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR") : "—",
      ])}
    />
  );
}
