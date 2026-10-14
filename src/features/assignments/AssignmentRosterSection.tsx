"use client";

import { AssignmentCloseActions, type AssignmentLifecycleItem } from "@/src/features/assignments/AssignmentCloseActions";
import { AssignmentScopeFields, filtersToQuery, useAssignmentScope, type RosterPhase } from "@/src/features/assignments/assignmentScope";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, SectionTable, SectionToolbar } from "@/src/ui";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const COLUMNS = ["Öğrenci", "Durum", "Tarih", ""];

const PHASE: Record<Exclude<RosterPhase, "NONE">, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  ASSIGNED: { label: "Atandı", tone: "neutral" },
  IN_PROGRESS: { label: "Devam Ediyor", tone: "info" },
  FINISHED: { label: "Bitti", tone: "warning" },
  EVALUATED: { label: "Değerlendirildi", tone: "success" },
  ABSENT: { label: "Girmedi", tone: "danger" },
};

function formatWindow(from?: string | null, until?: string | null) {
  const stamp = (value?: string | null) =>
    value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : null;
  const start = stamp(from);
  const end = stamp(until);
  if (!start && !end) return "Süresiz";
  return `${start ?? "Hemen"} → ${end ?? "Kapatılana kadar"}`;
}

/**
 * Atama listesi: kampüs ve sezon yalnızca birden fazlaysa seçilir.
 * Sınav, o sezondaki atamalar ve henüz atanmamış lisanslar. Ardından seviye ve şube.
 */
export function AssignmentRosterSection({ companyId }: { companyId: string }) {
  const hrefs = useOpsHref();
  const pathname = usePathname();
  const scope = useAssignmentScope(companyId, { includeLicensed: true });
  const { campusId, seasonId, examValue, gradeValue, branchValue, branchOptions, exams, selectedExam, assignments, rosterQ, rosterRows, gradingId, filters } = scope;
  const lifecycleItems = useMemo(() => lifecycleOf(rosterRows, assignments), [rosterRows, assignments]);

  if (scope.listFailed) {
    return <ErrorState error={scope.listError} onRetry={scope.refetchLists} compact />;
  }

  const ready = scope.ready;
  const listQuery = filtersToQuery(filters).toString();
  const returnTo = listQuery ? `${pathname}?${listQuery}` : pathname;
  const branchUnassigned =
    rosterQ.isSuccess && rosterRows.length > 0 && rosterRows.every((row) => row.phase === "NONE");
  const assignHref =
    branchUnassigned && selectedExam?.grantId && campusId && seasonId && branchValue
      ? `${hrefs.assign(selectedExam.grantId)}?${new URLSearchParams({
          instituteId: campusId,
          yearId: seasonId,
          branchId: branchValue,
        }).toString()}`
      : null;
  const waiting =
    campusId && seasonId && exams.length === 0
      ? { title: "Bu sezonda sınav yok", hint: "Yayınladığınız sınav burada görünür. Merkez kataloğundan bir sınav için önce lisans gerekir." }
      : examValue && gradeValue && branchOptions.length === 0
        ? { title: "Bu seviyede şube yok", hint: "Başka bir seviye seçin." }
        : { title: "Öğrenciler burada listelenir", hint: "Sınav, seviye ve şubeyi seçince şubedeki öğrencilerin durumu görünür." };

  return (
    <div className="grid gap-4">
      <AssignmentScopeFields scope={scope} />

      {scope.listLoading ? (
        <SectionTable loading columns={COLUMNS} rows={[]} empty="" />
      ) : !ready ? (
        <SectionTable columns={COLUMNS} rows={[]} empty={waiting.title} emptyHint={waiting.hint} emptyTone="neutral" />
      ) : rosterQ.isError ? (
        <ErrorState error={rosterQ.error} onRetry={() => void rosterQ.refetch()} compact />
      ) : (
        <SectionTable
          loading={rosterQ.isLoading}
          columns={COLUMNS}
          empty="Bu şubede öğrenci yok"
          emptyHint="Seçilen kampüs, sezon ve şubede aktif kaydı olan öğrenci bulunmuyor."
          emptyTone="neutral"
          toolbar={
            <SectionToolbar count={rosterQ.isSuccess ? rosterRows.length : undefined} noun="öğrenci" loading={rosterQ.isLoading}>
              {assignHref ? (
                <ButtonLink href={assignHref} size="sm">
                  Bu şubeye ata
                </ButtonLink>
              ) : null}
              <AssignmentCloseActions companyId={companyId} items={lifecycleItems} branchScoped />
              {gradingId ? (
                <ButtonLink href={`${hrefs.gradingBoard}${listQuery ? `?${listQuery}` : ""}`} size="sm">
                  Değerlendir
                </ButtonLink>
              ) : null}
              <ButtonLink href={hrefs.licensed} variant="secondary" size="sm">
                Yeni atama
              </ButtonLink>
            </SectionToolbar>
          }
          rows={rosterRows.map((row) => {
            const phase = row.phase === "NONE" ? null : PHASE[row.phase];
            const name = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || "Öğrenci";
            const assignment = assignments.find((item) => item.id === row.assignmentId);
            return [
              name,
              row.phase === "NONE" ? (
                <Badge key="p" tone="neutral">
                  Atanmadı
                </Badge>
              ) : phase ? (
                <Badge key="p" tone={phase.tone} dot>
                  {phase.label}
                </Badge>
              ) : (
                ""
              ),
              assignment ? (
                <span key="d" className="whitespace-normal">
                  {formatWindow(assignment.availableFrom, assignment.availableUntil)}
                </span>
              ) : (
                ""
              ),
              row.phase === "IN_PROGRESS" && row.assignmentId ? (
                <div key="a" className="flex justify-end">
                  <ButtonLink
                    href={`${hrefs.monitor(row.assignmentId)}?studentId=${encodeURIComponent(row.studentId)}&from=${encodeURIComponent(returnTo)}`}
                    variant="secondary"
                    size="sm"
                  >
                    İzle
                  </ButtonLink>
                </div>
              ) : (
                ""
              ),
            ];
          })}
        />
      )}
    </div>
  );
}

function lifecycleOf(
  rows: { assignmentId?: string | null; phase: RosterPhase }[],
  assignments: { id?: string; status?: string | null; availableFrom?: string | null; availableUntil?: string | null }[],
): AssignmentLifecycleItem[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.assignmentId || seen.has(row.assignmentId)) continue;
    seen.add(row.assignmentId);
    ids.push(row.assignmentId);
  }
  return ids.map((id) => {
    const assignment = assignments.find((item) => item.id === id);
    return {
      id,
      status: assignment?.status,
      inProgress: rows.filter((row) => row.assignmentId === id && row.phase === "IN_PROGRESS").length,
      detail: assignment ? formatWindow(assignment.availableFrom, assignment.availableUntil) : undefined,
    };
  });
}
