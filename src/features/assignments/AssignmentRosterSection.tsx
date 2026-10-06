"use client";

import { AssignmentScopeFields, filtersToQuery, useAssignmentScope, type RosterPhase } from "@/src/features/assignments/assignmentScope";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, ButtonLink, ErrorState, SectionTable, SectionToolbar } from "@/src/ui";
import { usePathname } from "next/navigation";

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
 * Sınav (o sezonda ataması olanlar) → seviye → sınıf, ardından şubedeki tüm öğrenciler.
 */
export function AssignmentRosterSection({ companyId }: { companyId: string }) {
  const hrefs = useOpsHref();
  const pathname = usePathname();
  const scope = useAssignmentScope(companyId);
  const { campusId, seasonId, examValue, gradeValue, branchOptions, exams, assignments, rosterQ, rosterRows, gradingId, filters } = scope;

  if (scope.listFailed) {
    return <ErrorState error={scope.listError} onRetry={scope.refetchLists} compact />;
  }

  const ready = scope.ready;
  const listQuery = filtersToQuery(filters).toString();
  const returnTo = listQuery ? `${pathname}?${listQuery}` : pathname;
  const waiting =
    campusId && seasonId && exams.length === 0
      ? { title: "Bu sezonda ataması olan sınav yok", hint: "Başka bir sezon seçin ya da lisanslı sınavlardan yeni bir atama açın." }
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
              phase ? (
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
