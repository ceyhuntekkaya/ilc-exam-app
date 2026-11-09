"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getList9QueryKey as getCertificatesQueryKey,
  useIssue as useIssueCertificate,
  useList9 as useCertificates,
  useRevoke as useRevokeCertificate,
  useRevokeAndReissue as useReissueCertificate,
} from "@/src/api/generated/certificate-admin/certificate-admin";
import type { CertificateDto } from "@/src/api/generated/models";
import { useAuth } from "@/src/components/auth-provider";
import { shortId } from "@/src/features/admin/policyBundleModel";
import { HQ_CONTENT_ORG_ID } from "@/src/features/authoring/shared/api";
import {
  LOCALES,
  REASON_MAX,
  certificateFailure,
  certificateStatusLabel,
  certificateStatusTone,
  isActiveCertificate,
  isUuid,
  localeLabel,
  pageCount,
  toIssueRequest,
  toReissueRequest,
  validateIssue,
  validateReason,
  type IssueForm,
} from "@/src/features/certificate/certificateModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan, usePanel } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Alert, Badge, Button, ErrorState, Field, FormDialog, Input, Select, SectionTable, SectionToolbar, Textarea, notify } from "@/src/ui";

const PAGE_SIZE = 20;

type RowAction = { kind: "revoke" | "reissue"; cert: CertificateDto };

/**
 * R-19 / R-22 (B-33): sertifika yönetimi — liste, basım, iptal, iptal+yeniden basım.
 * Yetki: basım ve yeniden basım `certificate:manage`; salt iptal `certificate:manage` YA DA `assignment:evaluate` (K-H06).
 * Yazma düğmeleri yetkisizlere gösterilmez. Kapı kapalıyken basım 409 döner (beklenen); mesaj karşılanmayan koşulları listeler
 * ve AYNEN gösterilir. Merkez tüm kurumları (isteğe bağlı kurum süzgeciyle), kurum personeli yalnız kendi kurumunu görür.
 */
export function CertificateSection() {
  const { user } = useAuth();
  const { role } = usePanel();
  const canManage = useCan(Perm.certificateManage);
  const canRevoke = useCan(Perm.certificateManage, Perm.assignmentEvaluate);
  const central = role === "SUPER_ADMIN" || user?.companyId === HQ_CONTENT_ORG_ID;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [companyDraft, setCompanyDraft] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [action, setAction] = useState<RowAction | null>(null);

  const filter = central && isUuid(companyId) ? { companyId: companyId.trim() } : {};
  const query = useCertificates({ ...filter, page, size: PAGE_SIZE });
  const rows = query.data?.data.items ?? [];
  const total = query.data?.data.total ?? 0;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getCertificatesQueryKey() });
  }

  return (
    <div className="grid gap-4">
      <div role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
        Sertifika basımı, sertifika kapısı (kalibrasyon eşikleri ve iki akademik onay) açılmadan yapılamaz; kapı kapalıyken basım denemesi
        karşılanmayan koşulları listeleyen bir uyarıyla reddedilir. Bu bir hata değil, beklenen davranıştır.
      </div>

      {central ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setCompanyId(companyDraft.trim());
            setPage(0);
          }}
        >
          <Field label="Kurum kimliği (UUID)" hint="Boş bırakırsanız tüm kurumlar listelenir" error={companyDraft && !isUuid(companyDraft) ? "Geçerli bir UUID girin" : undefined}>
            <Input value={companyDraft} onChange={(event) => setCompanyDraft(event.target.value)} placeholder="00000000-0000-…" />
          </Field>
          <Button type="submit" variant="secondary" disabled={companyDraft !== "" && !isUuid(companyDraft)}>
            Süz
          </Button>
        </form>
      ) : null}

      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          loading={query.isLoading}
          toolbar={
            <SectionToolbar count={total} noun="sertifika" loading={query.isLoading}>
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Önceki
              </Button>
              <span className="text-xs text-fg-muted">
                {page + 1} / {pageCount(total, PAGE_SIZE)}
              </span>
              <Button variant="secondary" size="sm" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
              {canManage ? <Button onClick={() => setIssuing(true)}>Sertifika bas</Button> : null}
            </SectionToolbar>
          }
          columns={["Kod", "Durum", "Dil", "Düzenlenme", "Geçerlilik", "Sonuç", "İptal", ""]}
          empty="Henüz sertifika yok"
          emptyHint="Sertifika kapısı açılıp ilk sertifika basıldığında burada listelenir."
          emptyTone="neutral"
          rows={rows.map((cert) => [
            <span key="c" className="font-mono text-[13px] font-semibold">
              {cert.certificateCode ?? "—"}
            </span>,
            <Badge key="s" tone={certificateStatusTone(cert.status)} dot>
              {certificateStatusLabel(cert.status)}
            </Badge>,
            localeLabel(cert.locale),
            formatDateTime(cert.issuedAt),
            cert.validUntil ? formatDateTime(cert.validUntil) : "Süresiz",
            <span key="r" className="font-mono text-xs text-fg-muted" title={cert.applicationResultId}>
              {shortId(cert.applicationResultId)}
            </span>,
            cert.revokedAt ? (
              <span key="v" className="text-xs text-fg-muted">
                {formatDateTime(cert.revokedAt)}
                {cert.revocationReason ? <span className="block max-w-56 truncate" title={cert.revocationReason}>{cert.revocationReason}</span> : null}
                {cert.supersededById ? <span className="block">Yerine: {shortId(cert.supersededById)}</span> : null}
              </span>
            ) : (
              "—"
            ),
            <div key="a" className="flex justify-end gap-1.5">
              {isActiveCertificate(cert) && canRevoke ? (
                <Button size="sm" variant="danger" onClick={() => setAction({ kind: "revoke", cert })}>
                  İptal et
                </Button>
              ) : null}
              {isActiveCertificate(cert) && canManage ? (
                <Button size="sm" variant="secondary" onClick={() => setAction({ kind: "reissue", cert })}>
                  İptal et ve yeniden bas
                </Button>
              ) : null}
            </div>,
          ])}
        />
      )}

      {issuing ? (
        <IssueDialog
          onClose={() => setIssuing(false)}
          onDone={async () => {
            setIssuing(false);
            await refresh();
          }}
        />
      ) : null}
      {action ? (
        <RevokeDialog
          key={`${action.kind}-${action.cert.id}`}
          action={action}
          onClose={() => setAction(null)}
          onDone={async () => {
            setAction(null);
            await refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ConflictNotice({ message }: { message: string }) {
  return (
    <div role="alert" className="whitespace-pre-line rounded-lg border border-warning/30 bg-warning-bg px-3 py-2.5 text-sm text-warning">
      <p className="font-semibold">İşlem şu an yapılamıyor</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function IssueDialog({ onClose, onDone }: { onClose: () => void; onDone: () => Promise<void> }) {
  const issue = useIssueCertificate();
  const [form, setForm] = useState<IssueForm>({ applicationResultId: "", skuId: "", locale: "tr" });
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof certificateFailure> | null>(null);
  const errors = validateIssue(form);

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setFailure(null);
    try {
      const result = await issue.mutateAsync({ data: toIssueRequest(form) });
      notify.success(`Sertifika basıldı: ${result.data.certificateCode ?? ""}`.trim());
      await onDone();
    } catch (err) {
      setFailure(certificateFailure(err, "Sertifika basılamadı"));
    }
  }

  return (
    <FormDialog
      open
      title="Sertifika bas"
      description="Yayınlanmış, başarılı bir sonuç için sertifika düzenler. Sertifika kapısı kapalıyken ya da imza anahtarı yokken basım reddedilir."
      submitLabel="Sertifika bas"
      pending={issue.isPending}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Sonuç kimliği (applicationResultId)" required error={touched ? errors.applicationResultId : undefined}>
        <Input value={form.applicationResultId} onChange={(e) => setForm({ ...form, applicationResultId: e.target.value })} placeholder="00000000-0000-…" />
      </Field>
      <Field label="Ürün (SKU) kimliği" required error={touched ? errors.skuId : undefined}>
        <Input value={form.skuId} onChange={(e) => setForm({ ...form, skuId: e.target.value })} placeholder="00000000-0000-…" />
      </Field>
      <Field label="Sertifika dili" required error={touched ? errors.locale : undefined}>
        <Select value={form.locale} onChange={(e) => setForm({ ...form, locale: e.target.value })}>
          {LOCALES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>
      {failure ? failure.conflict ? <ConflictNotice message={failure.message} /> : <Alert variant="danger">{failure.message}</Alert> : null}
    </FormDialog>
  );
}

function RevokeDialog({ action, onClose, onDone }: { action: RowAction; onClose: () => void; onDone: () => Promise<void> }) {
  const revoke = useRevokeCertificate();
  const reissue = useReissueCertificate();
  const [reason, setReason] = useState("");
  const [skuId, setSkuId] = useState(action.cert.skuId ?? "");
  const [locale, setLocale] = useState(action.cert.locale === "en" ? "en" : "tr");
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<ReturnType<typeof certificateFailure> | null>(null);
  const isReissue = action.kind === "reissue";
  const reasonIssue = validateReason(reason);
  const skuIssue = isReissue && !isUuid(skuId) ? "Geçerli bir ürün (SKU) kimliği (UUID) girin" : null;

  async function submit() {
    setTouched(true);
    if (reasonIssue || skuIssue || !action.cert.id) return;
    setFailure(null);
    try {
      if (isReissue) {
        const result = await reissue.mutateAsync({ id: action.cert.id, data: toReissueRequest(reason, skuId, locale) });
        notify.success(`Eski sertifika iptal edildi; yeni sertifika: ${result.data.certificateCode ?? ""}`.trim());
      } else {
        await revoke.mutateAsync({ id: action.cert.id, data: { reason: reason.trim() } });
        notify.success("Sertifika iptal edildi");
      }
      await onDone();
    } catch (err) {
      // 409 (kapı kapalı / imza yok / zaten iptal): sunucu mesajı aynen.
      setFailure(certificateFailure(err));
    }
  }

  return (
    <FormDialog
      open
      title={isReissue ? "Sertifikayı iptal et ve yeniden bas" : "Sertifikayı iptal et"}
      description={
        isReissue
          ? "Mevcut sertifika iptal edilir ve yenisi basılır; kapı yine kapalıysa hiçbir değişiklik yapılmaz. Gerekçe kayda geçer."
          : "Sertifika iptal edilir; doğrulama sayfasında geçersiz görünür. İşlem geri alınamaz. Gerekçe kayda geçer."
      }
      submitLabel={isReissue ? "İptal et ve yeniden bas" : "İptal et"}
      pending={revoke.isPending || reissue.isPending}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <p className="text-sm text-fg-muted">
        Sertifika: <span className="font-mono font-semibold text-fg">{action.cert.certificateCode}</span>
      </p>
      <Field label="Gerekçe" required hint={`En çok ${REASON_MAX} karakter`} error={touched ? (reasonIssue ?? undefined) : undefined}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={REASON_MAX + 50} />
      </Field>
      {isReissue ? (
        <>
          <Field label="Yeni sertifika için ürün (SKU) kimliği" required error={touched ? (skuIssue ?? undefined) : undefined}>
            <Input value={skuId} onChange={(e) => setSkuId(e.target.value)} />
          </Field>
          <Field label="Sertifika dili" required>
            <Select value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </>
      ) : null}
      {failure ? failure.conflict ? <ConflictNotice message={failure.message} /> : <Alert variant="danger">{failure.message}</Alert> : null}
    </FormDialog>
  );
}
