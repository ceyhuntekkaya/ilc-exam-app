"use client";

import { AssignmentCloseActions, type AssignmentLifecycleItem } from "@/src/features/assignments/AssignmentCloseActions";
import { AssignmentPlacementList } from "@/src/features/assignments/AssignmentPlacementList";
import { AssignmentScopeFields, filtersToQuery, useAssignmentScope, type RosterPhase } from "@/src/features/assignments/assignmentScope";
import { customInstance } from "@/src/api/mutator";
import { istanbulInstant, istanbulLabel } from "@/src/features/assignments/istanbulTime";
import { useOpsHref } from "@/src/features/panel/PanelContext";
import { Badge, Button, ButtonLink, ConfirmDialog, ErrorState, Field, FormDialog, Input, SectionTable, SectionToolbar, errorMessage, notify } from "@/src/ui";
import { useMutation } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

const COLUMNS = ["Öğrenci", "Durum", "Tarih", ""];

const PHASE: Record<Exclude<RosterPhase, "NONE">, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  ASSIGNED: { label: "Atandı", tone: "neutral" },
  IN_PROGRESS: { label: "Devam Ediyor", tone: "info" },
  FINISHED: { label: "Bitti", tone: "warning" },
  EVALUATED: { label: "Değerlendirildi", tone: "success" },
  ABSENT: { label: "Girmedi", tone: "danger" },
};

function formatWindow(from?: string | null, until?: string | null) {
  const stamp = (value?: string | null) => istanbulLabel(value);
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
  const scope = useAssignmentScope(companyId, { includeLicensed: true, publishedOnly: true });
  const { campusId, seasonId, examValue, gradeValue, branchValue, branchOptions, exams, selectedExam, assignments, rosterQ, rosterRows, gradingId, filters } = scope;
  const lifecycleItems = useMemo(() => lifecycleOf(rosterRows, assignments), [rosterRows, assignments]);
  const openAssignmentId = useMemo(() => {
    const open = assignments.filter(
      (item) =>
        item.status === "OPEN" &&
        item.id &&
        item.examVersionId === examValue &&
        item.instituteId === campusId &&
        item.academicYearId === seasonId,
    );
    return open.length === 1 ? open[0].id ?? null : null;
  }, [assignments, examValue, campusId, seasonId]);
  const [grantTarget, setGrantTarget] = useState<{ recipientId: string; name: string } | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<{ recipientId: string; name: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const addRecipient = useMutation({
    mutationFn: (studentId: string) => {
      if (!openAssignmentId) throw new Error("Açık atama yok");
      return customInstance(`/assignments/${openAssignmentId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
    },
    onSuccess: () => {
      notify.success("Öğrenci atamaya eklendi");
      void rosterQ.refetch();
    },
    onError: (err) => notify.error(errorMessage(err, "Öğrenci eklenemedi")),
  });
  const grantAttempt = useMutation({
    mutationFn: (recipientId: string) => customInstance(`/recipients/${recipientId}/grant-attempt`, { method: "POST" }),
    onSuccess: () => {
      notify.success("Ek deneme verildi");
      setGrantTarget(null);
      void rosterQ.refetch();
    },
    onError: (err) => notify.error(errorMessage(err, "Ek deneme verilemedi")),
  });
  const accessOverride = useMutation({
    mutationFn: (body: { recipientId: string; until: string; reason: string }) =>
      customInstance(`/recipients/${body.recipientId}/access-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until: body.until, reason: body.reason }),
      }),
    onSuccess: () => {
      notify.success("Erişim uzatıldı");
      setOverrideTarget(null);
      void rosterQ.refetch();
    },
    onError: (err) => {
      const message = errorMessage(err, "Erişim uzatılamadı");
      setFormError(message);
      notify.error(message);
    },
  });

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
              <span className="text-xs text-fg-subtle">Pencere saatleri İstanbul</span>
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
              <RosterActions
                key="a"
                row={row}
                assignmentStatus={assignment?.status}
                openAssignmentId={openAssignmentId}
                adding={addRecipient.isPending && addRecipient.variables === row.studentId}
                addDisabled={addRecipient.isPending}
                onAdd={() => addRecipient.mutate(row.studentId)}
                watchHref={
                  row.phase === "IN_PROGRESS" && row.assignmentId
                    ? `${hrefs.monitor(row.assignmentId)}?studentId=${encodeURIComponent(row.studentId)}&from=${encodeURIComponent(returnTo)}`
                    : null
                }
                onGrant={() => row.recipientId && setGrantTarget({ recipientId: row.recipientId, name })}
                onOverride={() => row.recipientId && setOverrideTarget({ recipientId: row.recipientId, name })}
              />,
            ];
          })}
        />
      )}
      <ConfirmDialog
        open={grantTarget !== null}
        onClose={() => setGrantTarget(null)}
        title="Ek deneme verilsin mi?"
        confirmLabel="Ver"
        tone="primary"
        pending={grantAttempt.isPending}
        description={
          grantTarget
            ? `${grantTarget.name} yeni bir deneme hakkı alır. Girmedi sayıldıysa yeniden atanır. Kapalı pencerede ayrıca erişim uzatmak gerekir.`
            : undefined
        }
        onConfirm={() => {
          if (grantTarget) grantAttempt.mutate(grantTarget.recipientId);
        }}
      />
      <AssignmentPlacementList
        assignments={assignments}
        grants={scope.grants}
        campusId={campusId}
        seasonId={seasonId}
        loading={scope.listLoading}
      />
      <FormDialog
        open={overrideTarget !== null}
        onClose={() => {
          setOverrideTarget(null);
          setFormError(null);
        }}
        title="Erişim uzat"
        description={overrideTarget ? `${overrideTarget.name} bu ana kadar kapalı pencerede girebilir.` : undefined}
        submitLabel="Uzat"
        pending={accessOverride.isPending}
        error={formError}
        onSubmit={async (fd) => {
          if (!overrideTarget) return;
          setFormError(null);
          const until = istanbulInstant(String(fd.get("until") || ""));
          const reason = String(fd.get("reason") || "").trim();
          if (!until || !reason) {
            setFormError("Bitiş ve gerekçe gerekli.");
            return;
          }
          try {
            await accessOverride.mutateAsync({ recipientId: overrideTarget.recipientId, until, reason });
          } catch {
            return;
          }
        }}
      >
        <Field label="Bitiş" required hint="Saat dilimi İstanbul.">
          <Input name="until" type="datetime-local" required />
        </Field>
        <Field label="Gerekçe" required>
          <Input name="reason" required />
        </Field>
      </FormDialog>
    </div>
  );
}

function RosterActions({
  row,
  assignmentStatus,
  openAssignmentId,
  adding,
  addDisabled,
  onAdd,
  watchHref,
  onGrant,
  onOverride,
}: {
  row: { phase: RosterPhase; recipientId?: string | null };
  assignmentStatus?: string | null;
  openAssignmentId: string | null;
  adding: boolean;
  addDisabled: boolean;
  onAdd: () => void;
  watchHref: string | null;
  onGrant: () => void;
  onOverride: () => void;
}) {
  const canGrant = Boolean(row.recipientId) && (row.phase === "ABSENT" || row.phase === "FINISHED" || row.phase === "EVALUATED");
  const canOverride = Boolean(row.recipientId) && (row.phase === "ABSENT" || assignmentStatus === "CLOSED");
  if (row.phase === "NONE" && openAssignmentId) {
    return (
      <div className="flex justify-end">
        <Button type="button" size="sm" className="min-h-11" loading={adding} disabled={addDisabled} onClick={onAdd}>
          Atamaya ekle
        </Button>
      </div>
    );
  }
  if (!watchHref && !canGrant && !canOverride) return "";
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {watchHref ? (
        <ButtonLink href={watchHref} variant="secondary" size="sm">
          İzle
        </ButtonLink>
      ) : null}
      {canGrant ? (
        <Button type="button" size="sm" className="min-h-11" onClick={onGrant}>
          Ek deneme
        </Button>
      ) : null}
      {canOverride ? (
        <Button type="button" size="sm" variant="secondary" className="min-h-11" onClick={onOverride}>
          Erişim uzat
        </Button>
      ) : null}
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
