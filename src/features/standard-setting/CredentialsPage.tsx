"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListCredentialsQueryKey,
  useApproveCredential,
  useListCredentials,
  useRejectCredential,
  useRequestCredential,
  useSuspendCredential,
} from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { CredentialView } from "@/src/api/generated/models";
import { useCan } from "@/src/features/panel/PanelContext";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { StaffPicker } from "@/src/features/standard-setting/pickers";
import { StandardSettingSubNav } from "@/src/features/standard-setting/SubNav";
import {
  CREDENTIAL_STATUS_TONE,
  credentialActions,
  credentialStatusLabel,
  dayToInstant,
  validateCredentialForm,
  type CredentialAction,
  type CredentialFormState,
} from "@/src/features/standard-setting/model";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, ErrorState, Field, FormDialog, Input, PageHeader, SectionTable, SectionToolbar, errorMessage, notify } from "@/src/ui";

const ACTION_LABEL: Record<CredentialAction, string> = { approve: "Onayla", reject: "Reddet", suspend: "Askıya al" };
const EMPTY: CredentialFormState = { staffUserId: "", trainedAt: "", validUntil: "" };

/** R-15 (E-37): panelist kimliği (STAFF + PanelistCredential) talep ve onay ekranı. */
export function CredentialsPage() {
  const { ready, request } = useCentralRequest();
  const canManage = useCan(Perm.psychometricsManage);
  const query = useListCredentials({ query: { enabled: ready }, request });
  const [requesting, setRequesting] = useState(false);
  const [action, setAction] = useState<{ kind: CredentialAction; credential: CredentialView } | null>(null);
  const rows = query.data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Panelist kimlikleri"
        description="Standart belirleme panelinde yer alacak merkez personelinin eğitim ve geçerlilik kaydı. Yalnız onaylı ve süresi dolmamış kimlik panele eklenebilir ve puan girebilir."
      />
      <PsychometricsTabs />
      <StandardSettingSubNav />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          columns={["Personel", "Durum", "Eğitim", "Geçerlilik", "Not", ""]}
          loading={query.isLoading || !ready}
          empty="Henüz panelist kimliği yok"
          emptyHint={canManage ? "“Kimlik talep et” ile bir personel için kimlik kaydı açın." : "Kimlik talepleri burada listelenir."}
          emptyTone="neutral"
          toolbar={
            <SectionToolbar count={rows.length} noun="kimlik" loading={query.isLoading}>
              {canManage ? <Button onClick={() => setRequesting(true)}>Kimlik talep et</Button> : null}
            </SectionToolbar>
          }
          rows={rows.map((row) => [
            row.displayName ?? row.staffId ?? "—",
            <Badge key="s" tone={CREDENTIAL_STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
              {row.status === "APPROVED" && row.validNow === false ? "Süresi doldu" : credentialStatusLabel(row.status)}
            </Badge>,
            formatWhen(row.trainedAt),
            formatWhen(row.validUntil),
            row.reviewNote ?? "—",
            <div key="a" className="flex justify-end gap-2">
              {canManage
                ? credentialActions(row.status).map((kind) => (
                    <Button key={kind} size="sm" variant={kind === "approve" ? "primary" : "secondary"} onClick={() => setAction({ kind, credential: row })}>
                      {ACTION_LABEL[kind]}
                    </Button>
                  ))
                : null}
            </div>,
          ])}
        />
      )}
      <RequestDialog key={requesting ? "open" : "closed"} open={requesting} onClose={() => setRequesting(false)} />
      <ActionDialog target={action} onClose={() => setAction(null)} />
    </div>
  );
}

export function RequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const create = useRequestCredential({ request });
  const [form, setForm] = useState<CredentialFormState>(EMPTY);
  const [pickedName, setPickedName] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validateCredentialForm(form);

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      await create.mutateAsync({
        data: { staffUserId: form.staffUserId, trainedAt: dayToInstant(form.trainedAt)!, validUntil: dayToInstant(form.validUntil)! },
      });
      await queryClient.invalidateQueries({ queryKey: getListCredentialsQueryKey() });
      notify.success("Kimlik talebi oluşturuldu; onay bekliyor");
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Kimlik talebi oluşturulamadı"));
    }
  }

  return (
    <FormDialog
      open={open}
      title="Panelist kimliği talep et"
      description="Talep oluşturulunca onay bekler; onaylanana dek personel panele eklenemez."
      submitLabel="Talep et"
      pending={create.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {form.staffUserId ? (
        <p className="text-sm text-fg">
          Seçilen personel: <span className="font-medium">{pickedName ?? form.staffUserId}</span>
        </p>
      ) : (
        <StaffPicker onPick={(id, name) => { setForm((f) => ({ ...f, staffUserId: id })); setPickedName(name); }} />
      )}
      {touched && errors.staffUserId ? <p className="text-xs text-danger">{errors.staffUserId}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Eğitim tarihi" required error={touched ? errors.trainedAt : undefined}>
          <Input type="date" value={form.trainedAt} onChange={(e) => setForm({ ...form, trainedAt: e.target.value })} />
        </Field>
        <Field label="Geçerlilik bitişi" required error={touched ? errors.validUntil : undefined}>
          <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </Field>
      </div>
    </FormDialog>
  );
}

function ActionDialog({ target, onClose }: { target: { kind: CredentialAction; credential: CredentialView } | null; onClose: () => void }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const approve = useApproveCredential({ request });
  const reject = useRejectCredential({ request });
  const suspend = useSuspendCredential({ request });
  const [error, setError] = useState<string | undefined>();

  async function confirm({ reason }: { reason: string }) {
    if (!target?.credential.id) return;
    const credentialId = target.credential.id;
    setError(undefined);
    try {
      if (target.kind === "approve") await approve.mutateAsync({ credentialId });
      if (target.kind === "reject") await reject.mutateAsync({ credentialId, data: { reason: reason.trim() } });
      if (target.kind === "suspend") await suspend.mutateAsync({ credentialId, data: { reason: reason.trim() } });
      await queryClient.invalidateQueries({ queryKey: getListCredentialsQueryKey() });
      notify.success(`${ACTION_LABEL[target.kind]}: tamamlandı`);
      onClose();
    } catch (e) {
      setError(errorMessage(e, "İşlem tamamlanamadı"));
    }
  }

  const needsReason = target?.kind !== "approve";
  const name = target?.credential.displayName ?? "personel";
  return (
    <ConfirmDialog
      open={target !== null}
      title={target ? `${ACTION_LABEL[target.kind]}: ${name}` : ""}
      description={
        target?.kind === "approve"
          ? "Onaylanan kimlik, geçerlilik süresi boyunca panele eklenebilir ve puan girebilir."
          : target?.kind === "reject"
            ? "Talep reddedilir; gerekçe kayda geçer."
            : "Kimlik askıya alınır; personel açık turlarda puan giremez. Gerekçe kayda geçer."
      }
      confirmLabel={target ? ACTION_LABEL[target.kind] : "Onayla"}
      tone={target?.kind === "approve" ? "primary" : "danger"}
      reasonRequired={needsReason}
      reasonLabel="Gerekçe"
      pending={approve.isPending || reject.isPending || suspend.isPending}
      error={error}
      onClose={onClose}
      onConfirm={(input) => void confirm(input)}
    />
  );
}
