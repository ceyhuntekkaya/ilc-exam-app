"use client";

import { getListAssignmentsQueryKey, useListAssignments, useListGrants } from "@/src/api/generated/admin-exams/admin-exams";
import { customInstance } from "@/src/api/mutator";
import { assignmentStatusLabel } from "@/src/features/admin/labels";
import { istanbulLabel } from "@/src/features/assignments/istanbulTime";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, Button, ButtonLink, ConfirmDialog, ErrorState, FilterTabs, SectionTable, SectionToolbar, errorMessage, notify } from "@/src/ui";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const COLUMNS = ["Sınav", "Paket", "Durum", "Pencere", ""];
const STATUSES = ["OPEN", "DRAFT", "CLOSED"] as const;

function formatWindow(from?: string | null, until?: string | null) {
  const f = (value?: string | null) => istanbulLabel(value);
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
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: (assignmentId: string) => customInstance(`/assignments/${assignmentId}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: getListAssignmentsQueryKey({ companyId }) });
      notify.success("Taslak silindi");
      setToDelete(null);
    },
    onError: (err) => notify.error(errorMessage(err, "Taslak silinemedi")),
  });

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
            <span className="text-xs text-fg-subtle">Pencere saatleri İstanbul</span>
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
          const grant =
            grants.find((item) => item.examVersionId === row.examVersionId) ??
            grants.find((item) => item.examId && item.examId === row.examId);
          const title = grant?.examTitle ?? "Sınav";
          return [
            title,
            row.examVersionNo != null ? `v${row.examVersionNo}` : "—",
            <Badge
              key="s"
              tone={row.status === "OPEN" ? "success" : row.status === "CLOSED" ? "neutral" : "info"}
              dot
            >
              {assignmentStatusLabel(row.status)}
            </Badge>,
            <span key="w" className="whitespace-nowrap">{formatWindow(row.availableFrom, row.availableUntil)}</span>,
            row.id && row.status === "DRAFT" ? (
              <div key="a" className="flex justify-end">
                <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={() => setToDelete(row.id ?? null)}>
                  Sil
                </Button>
              </div>
            ) : row.id ? (
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
      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Taslak silinsin mi?"
        confirmLabel="Sil"
        tone="danger"
        pending={remove.isPending}
        description="Açılmamış taslak listeden kalkar. Açık atama bu düğmeyle silinmez."
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete);
        }}
      />
    </div>
  );
}
