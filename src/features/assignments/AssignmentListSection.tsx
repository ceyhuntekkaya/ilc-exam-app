"use client";

import { useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, FilterTabs, SectionTable, SectionToolbar } from "@/src/ui";
import { useState } from "react";

const COLUMNS = ["Sınav", "Durum", "Pencere", ""];
const STATUSES = ["OPEN", "DRAFT", "CLOSED"] as const;

function formatWindow(from?: string | null, until?: string | null) {
  const f = (value?: string | null) =>
    value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : null;
  const a = f(from);
  const b = f(until);
  if (!a && !b) return "Süresiz";
  return `${a ?? "Hemen"} → ${b ?? "Kapatılana kadar"}`;
}

/**
 * Atama listesi: durum filtresi (Açık / Taslak / Kapalı) + sayı.
 * `focus="grading"` (Değerlendirme menüsü): birincil eylem "Değerlendir".
 */
export function AssignmentListSection({ companyId, focus }: { companyId: string; focus?: "grading" }) {
  const hrefs = useOpsHref();
  const { data, isLoading, isError, error, refetch } = useListAssignments({ companyId });
  const grants = useListGrants({ companyId }).data?.data ?? [];
  const all = data?.data ?? [];
  const [status, setStatus] = useState<string | null>(null);
  const rows = status ? all.filter((row) => row.status === status) : all;

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} compact />;

  return (
    <div className="grid gap-4">
      <SectionTable
        tabs={
          <FilterTabs
              label="Atama durumu"
              value={status}
              onChange={setStatus}
              items={[
                { label: "Tümü", value: null, count: isLoading ? undefined : all.length },
                ...STATUSES.map((code) => ({
                  label: assignmentStatusLabel(code),
                  value: code,
                  count: isLoading ? undefined : all.filter((row) => row.status === code).length,
                })),
              ]}
            />
        }
        toolbar={
          <SectionToolbar count={rows.length} noun="atama" loading={isLoading}>
            <ButtonLink href={hrefs.licensed} variant="secondary" size="sm">
              Yeni atama
            </ButtonLink>
          </SectionToolbar>
        }
        loading={isLoading}
        empty={status ? "Bu durumda atama yok" : "Henüz atama yok"}
        emptyTone={status ? "neutral" : "primary"}
        emptyAction={status ? undefined : <ButtonLink href={hrefs.licensed}>Lisanslı sınavlardan ata</ButtonLink>}
        emptyHint={
          status
            ? "Başka bir durum seçin ya da Tümü'ne dönün."
            : "Lisanslı sınavlar listesinden bir sınavı sınıfa ya da öğrenciye atayın."
        }
        columns={COLUMNS}
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
            <span key="w" className="whitespace-nowrap">{formatWindow(row.availableFrom, row.availableUntil)}</span>,
            row.id ? (
              <div key="a" className="flex flex-wrap justify-end gap-2">
                <ButtonLink href={hrefs.monitor(row.id)} variant={focus === "grading" ? "ghost" : "secondary"} size="sm">
                  İzle
                </ButtonLink>
                <ButtonLink href={hrefs.grading(row.id)} variant={focus === "grading" ? "secondary" : "ghost"} size="sm">
                  Değerlendir
                </ButtonLink>
              </div>
            ) : (
              ""
            ),
          ];
        })}
      />
    </div>
  );
}
