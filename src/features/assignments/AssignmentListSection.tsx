"use client";

import { useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, SectionTable } from "@/src/ui";

export function AssignmentListSection({ companyId }: { companyId: string }) {
  const hrefs = useOpsHref();
  const { data, isLoading, isError, error, refetch } = useListAssignments({ companyId });
  const grants = useListGrants({ companyId }).data?.data ?? [];
  const rows = data?.data ?? [];

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;
  if (isLoading) return <SectionTable flush loading empty="" columns={["Sınav", "Durum", "Pencere", ""]} rows={[]} />;

  return (
    <SectionTable
      flush
      empty="Atama yok"
      columns={["Sınav", "Durum", "Pencere", ""]}
      rows={rows.map((row) => {
        const title =
          grants.find((grant) => grant.examVersionId === row.examVersionId)?.examTitle ?? "Sınav";
        return [
          title,
          <Badge
            key="s"
            tone={row.status === "OPEN" ? "success" : row.status === "CLOSED" ? "neutral" : "info"}
            dot
          >
            {assignmentStatusLabel(row.status)}
          </Badge>,
          `${row.availableFrom ? new Date(row.availableFrom).toLocaleString("tr-TR") : "—"} → ${
            row.availableUntil ? new Date(row.availableUntil).toLocaleString("tr-TR") : "—"
          }`,
          row.id ? (
            <div key="a" className="flex flex-wrap justify-end gap-2">
              <ButtonLink href={hrefs.monitor(row.id)} variant="ghost" size="sm">
                İzle
              </ButtonLink>
              <ButtonLink href={hrefs.grading(row.id)} variant="ghost" size="sm">
                Değerlendir
              </ButtonLink>
            </div>
          ) : (
            ""
          ),
        ];
      })}
    />
  );
}
