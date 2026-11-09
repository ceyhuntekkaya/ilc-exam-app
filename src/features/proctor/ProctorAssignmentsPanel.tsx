"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListProctorsQueryKey,
  useAssignProctor,
  useListProctors,
} from "@/src/api/generated/proctor-console/proctor-console";
import type { AssignmentView } from "@/src/api/generated/models";
import { shortId } from "@/src/features/admin/policyBundleModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import {
  PROCTOR_ROLES,
  ROLE_HINT,
  downgradeWarning,
  proctorFailureMessage,
  roleLabel,
  toAssignRequest,
  validateAssign,
  type AssignForm,
  type ProctorRoleValue,
} from "@/src/features/proctor/proctorModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ErrorState, Field, FormCard, FormDialog, Input, SectionTable, Select, notify } from "@/src/ui";

/**
 * R-19 / R-22 (B-32): seansın gözetmen atamaları — rol (ILC personeli / akredite harici / kurum personeli) seçerek atama.
 * İstenen rol ile geçerli rol ayrılabilir: akreditasyon geçerli değilse ACCREDITED_EXTERNAL → INSTITUTION_STAFF'a düşer
 * (`downgraded=true`) ve bu açıkça uyarılır. Yazma yalnız `center:manage` ile (düğme yetkisizlere gösterilmez).
 */
export function ProctorAssignmentsPanel({ sessionId }: { sessionId: string }) {
  const canManage = useCan(Perm.centerManage);
  const queryClient = useQueryClient();
  const query = useListProctors(sessionId);
  const [assigning, setAssigning] = useState(false);
  const rows: AssignmentView[] = query.data?.data ?? [];

  return (
    <FormCard
      title={`Gözetmenler (${rows.length})`}
      description="Seansa atanan gözetmenler ve rolleri. Rol, bütünlük seviyesini belirler: ILC personeli en yüksek, kurum personeli en düşük katkıyı verir."
      aside={
        canManage ? (
          <Button size="sm" onClick={() => setAssigning(true)}>
            Gözetmen ata
          </Button>
        ) : null
      }
    >
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          loading={query.isLoading}
          columns={["Gözetmen", "Rol", "Aday sınırı", "Atanma", ""]}
          empty="Henüz gözetmen atanmadı"
          emptyHint="Seans başlamadan önce en az bir gözetmen atayın."
          emptyTone="neutral"
          rows={rows.map((row) => {
            const warning = downgradeWarning(row);
            return [
              <span key="s" className="font-mono text-xs" title={row.staffId}>
                {shortId(row.staffId)}
              </span>,
              <span key="r" className="grid gap-1">
                <span>{roleLabel(row.effectiveRole)}</span>
                {warning ? <Badge tone="warning">{`İstenen rol düştü: ${roleLabel(row.requestedRole)}`}</Badge> : null}
              </span>,
              row.maxCandidates ?? "Sınırsız",
              formatDateTime(row.assignedAt),
              warning ? (
                <span key="w" className="text-xs text-warning" role="note">
                  Akreditasyon geçerli değil
                </span>
              ) : (
                ""
              ),
            ];
          })}
        />
      )}
      {assigning ? (
        <AssignDialog
          sessionId={sessionId}
          onClose={() => setAssigning(false)}
          onDone={async () => {
            await queryClient.invalidateQueries({ queryKey: getListProctorsQueryKey(sessionId) });
          }}
        />
      ) : null}
    </FormCard>
  );
}

function AssignDialog({ sessionId, onClose, onDone }: { sessionId: string; onClose: () => void; onDone: () => Promise<void> }) {
  const assign = useAssignProctor();
  const [form, setForm] = useState<AssignForm>({ staffId: "", role: "INSTITUTION_STAFF", maxCandidates: "" });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const errors = validateAssign(form);

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      const result = await assign.mutateAsync({ sessionId, data: toAssignRequest(form) });
      await onDone();
      const downgrade = downgradeWarning(result.data);
      if (downgrade) {
        // Atama yapıldı ama rol düştü: pencere açık kalır, uyarı okunur.
        setWarning(downgrade);
        return;
      }
      notify.success("Gözetmen atandı");
      onClose();
    } catch (err) {
      setError(proctorFailureMessage(err, "Gözetmen atanamadı"));
    }
  }

  if (warning) {
    return (
      <FormDialog open title="Gözetmen atandı — rol düşürüldü" submitLabel="Tamam" onClose={onClose} onSubmit={onClose}>
        <p role="alert" className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2.5 text-sm text-warning">
          {warning}
        </p>
      </FormDialog>
    );
  }

  return (
    <FormDialog
      open
      title="Gözetmen ata"
      description="Personel kimliği boş bırakılırsa atamayı yapan kişinin kendisi atanır."
      submitLabel="Ata"
      pending={assign.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Personel kimliği (UUID)" hint="Boş = kendiniz" error={touched ? errors.staffId : undefined}>
        <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} placeholder="00000000-0000-…" />
      </Field>
      <Field label="Rol" required hint={ROLE_HINT[form.role as ProctorRoleValue]} error={touched ? errors.role : undefined}>
        <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {PROCTOR_ROLES.map((role) => (
            <option key={role} value={role}>
              {roleLabel(role)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="En çok aday sayısı" hint="İsteğe bağlı" error={touched ? errors.maxCandidates : undefined}>
        <Input inputMode="numeric" value={form.maxCandidates} onChange={(e) => setForm({ ...form, maxCandidates: e.target.value })} />
      </Field>
    </FormDialog>
  );
}
