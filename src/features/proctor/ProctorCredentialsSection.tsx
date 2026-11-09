"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getList3QueryKey as getCredentialsQueryKey,
  useApprove1 as useApproveCredential,
  useList3 as useCredentials,
  useReject as useRejectCredential,
  useRequest as useRequestCredential,
  useSuspend as useSuspendCredential,
} from "@/src/api/generated/proctor-accreditation/proctor-accreditation";
import type { CredentialDto } from "@/src/api/generated/models";
import { useAuth } from "@/src/components/auth-provider";
import { shortId } from "@/src/features/admin/policyBundleModel";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan, usePanel } from "@/src/features/panel/PanelContext";
import {
  CREDENTIAL_STATUS_TABS,
  credentialActions,
  credentialStatusLabel,
  credentialStatusTone,
  isCredentialValidNow,
  proctorFailureMessage,
  toCredentialRequest,
  validateCredentialRequest,
  type CredentialAction,
  type CredentialForm,
} from "@/src/features/proctor/proctorModel";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, ErrorState, Field, FilterTabs, FormDialog, Input, SectionTable, SectionToolbar, notify } from "@/src/ui";

const ACTION_LABEL: Record<CredentialAction, string> = { approve: "Onayla", reject: "Reddet", suspend: "Askıya al" };

type Target = { kind: CredentialAction; credential: CredentialDto };

/**
 * R-19 / R-22 (B-32): harici gözetmen akreditasyonu. Kurum yalnız TALEP eder; onay, red ve askıya alma yalnız MERKEZE aittir
 * (kurum kullanıcısına bu düğmeler hiç gösterilmez). Talep eden/personelin kendisi onaylayamaz — sunucu 409 mesajı aynen gösterilir.
 * Tüm uçlar `center:manage` ister (yetkisizde ekran menüde yoktur).
 */
export function ProctorCredentialsSection() {
  const { user } = useAuth();
  const { role } = usePanel();
  const canManage = useCan(Perm.centerManage);
  const central = role === "SUPER_ADMIN" || user?.companyId === HQ_CONTENT_ORG_ID;
  const [status, setStatus] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const query = useCredentials(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED" } : undefined);
  const rows: CredentialDto[] = query.data?.data ?? [];

  return (
    <div className="grid gap-4">
      {!central ? (
        <p role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
          Kurum olarak yalnız akreditasyon talebi oluşturabilirsiniz. Onay, red ve askıya alma merkez tarafından yapılır.
        </p>
      ) : null}
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          loading={query.isLoading}
          tabs={<FilterTabs label="Akreditasyon durumu" items={CREDENTIAL_STATUS_TABS} value={status} onChange={setStatus} />}
          toolbar={
            <SectionToolbar count={rows.length} noun="akreditasyon" loading={query.isLoading}>
              {canManage ? <Button onClick={() => setRequesting(true)}>Akreditasyon talep et</Button> : null}
            </SectionToolbar>
          }
          columns={["Personel", "Durum", "Eğitim", "Geçerlilik", "Not", ""]}
          empty="Henüz akreditasyon kaydı yok"
          emptyHint={canManage ? "“Akreditasyon talep et” ile harici gözetmen için kayıt açın." : "Akreditasyon kayıtları burada listelenir."}
          emptyTone="neutral"
          rows={rows.map((row) => [
            <span key="s" className="font-mono text-xs" title={row.staffId}>
              {shortId(row.staffId)}
            </span>,
            <Badge key="b" tone={credentialStatusTone(row.status)} dot>
              {row.status === "APPROVED" && !isCredentialValidNow(row) ? "Süresi doldu" : credentialStatusLabel(row.status)}
            </Badge>,
            formatDateTime(row.trainedAt),
            formatDateTime(row.validUntil),
            row.reviewNote ?? "—",
            <div key="a" className="flex justify-end gap-1.5">
              {canManage
                ? credentialActions(row, central).map((kind) => (
                    <Button key={kind} size="sm" variant={kind === "approve" ? "primary" : "secondary"} onClick={() => setTarget({ kind, credential: row })}>
                      {ACTION_LABEL[kind]}
                    </Button>
                  ))
                : null}
            </div>,
          ])}
        />
      )}
      {requesting ? <RequestDialog onClose={() => setRequesting(false)} /> : null}
      <ActionDialog target={target} onClose={() => setTarget(null)} />
    </div>
  );
}

const EMPTY: CredentialForm = { staffId: "", trainedAt: "", validUntil: "" };

function RequestDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const create = useRequestCredential();
  const [form, setForm] = useState<CredentialForm>(EMPTY);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validateCredentialRequest(form);

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      await create.mutateAsync({ data: toCredentialRequest(form) });
      await queryClient.invalidateQueries({ queryKey: getCredentialsQueryKey() });
      notify.success("Akreditasyon talebi oluşturuldu; merkez onayı bekliyor");
      onClose();
    } catch (err) {
      setError(proctorFailureMessage(err, "Talep oluşturulamadı"));
    }
  }

  return (
    <FormDialog
      open
      title="Akreditasyon talep et"
      description="Eğitim tarihi ve geçerlilik bitişi zorunludur (bitiş gelecekte olmalı). Talep merkez onayına gider; onaylanana dek ACCREDITED_EXTERNAL rolü kullanılamaz."
      submitLabel="Talep et"
      pending={create.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Personel kimliği (UUID)" required error={touched ? errors.staffId : undefined}>
        <Input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} placeholder="00000000-0000-…" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Eğitim tarihi" required error={touched ? errors.trainedAt : undefined}>
          <Input type="date" value={form.trainedAt} onChange={(e) => setForm({ ...form, trainedAt: e.target.value })} />
        </Field>
        <Field label="Geçerlilik bitişi" required hint="Gelecekte bir tarih" error={touched ? errors.validUntil : undefined}>
          <Input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
        </Field>
      </div>
    </FormDialog>
  );
}

function ActionDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const approve = useApproveCredential();
  const reject = useRejectCredential();
  const suspend = useSuspendCredential();
  const [error, setError] = useState<string | undefined>();

  async function confirm({ reason }: { reason: string }) {
    const id = target?.credential.id;
    if (!target || !id) return;
    setError(undefined);
    try {
      if (target.kind === "approve") await approve.mutateAsync({ id });
      if (target.kind === "reject") await reject.mutateAsync({ id, data: { reason: reason.trim() } });
      if (target.kind === "suspend") await suspend.mutateAsync({ id, data: { reason: reason.trim() } });
      await queryClient.invalidateQueries({ queryKey: getCredentialsQueryKey() });
      notify.success(`${ACTION_LABEL[target.kind]}: tamamlandı`);
      onClose();
    } catch (err) {
      // 409: talep eden/personelin kendisi onaylayamaz, durum uygun değil… sunucu mesajı aynen.
      setError(proctorFailureMessage(err));
    }
  }

  const kind = target?.kind;
  return (
    <ConfirmDialog
      open={target !== null}
      title={kind ? `${ACTION_LABEL[kind]}: ${shortId(target?.credential.staffId)}` : ""}
      description={
        kind === "approve"
          ? "Onaylanan akreditasyon geçerlilik süresi boyunca ACCREDITED_EXTERNAL rolüne izin verir. Talebi açan ya da personelin kendisi onaylayamaz."
          : kind === "reject"
            ? "Talep reddedilir; gerekçe kayda geçer."
            : "Akreditasyon askıya alınır; bu personelin harici gözetmen rolü kurum personeli rolüne düşer. Gerekçe kayda geçer."
      }
      confirmLabel={kind ? ACTION_LABEL[kind] : "Onayla"}
      tone={kind === "approve" ? "primary" : "danger"}
      reasonRequired={kind !== undefined && kind !== "approve"}
      reasonLabel="Gerekçe"
      pending={approve.isPending || reject.isPending || suspend.isPending}
      error={error}
      onClose={onClose}
      onConfirm={(input) => void confirm(input)}
    />
  );
}
