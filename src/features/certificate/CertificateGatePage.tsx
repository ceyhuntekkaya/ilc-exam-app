"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStatusQueryKey as getApprovalStatusQueryKey,
  useApprove2 as useApproveCertificate,
  useStatus as useApprovalStatus,
} from "@/src/api/generated/certificate-approvals/certificate-approvals";
import { useList4 as useBundles } from "@/src/api/generated/policy-bundles/policy-bundles";
import { useAuth } from "@/src/components/auth-provider";
import { purposeLabel, shortId } from "@/src/features/admin/policyBundleModel";
import {
  NOTE_MAX,
  approvalFailureMessage,
  approvalProgress,
  approverLabel,
  bundleConditionsLabel,
  canGiveApproval,
  conditionLabel,
  conditionState,
  gateVerdict,
  missingConditions,
  readinessFailureMessage,
  type ReadinessReport,
  readinessRows,
  validateNote,
} from "@/src/features/certificate/certificateGateModel";
import { getCalibrationReadiness } from "@/src/features/certificate/readinessApi";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { useCentralRequest } from "@/src/features/psychometrics/central";
import { ExamVersionPicker } from "@/src/features/standard-setting/pickers";
import { isUuid } from "@/src/features/standard-setting/model";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ErrorState, Field, FormCard, FormDialog, Input, PageHeader, Select, Spinner, Textarea } from "@/src/ui";

/**
 * R-19 / R-22: sertifika kapısı ekranı — (1) CERTIFICATION demeti için iki akademik onayın durumu ve onay verme,
 * (2) kapının GERÇEK durumunu gösteren hazırlık raporu. "Demet koşulları sağlandı" kapının açık olduğu anlamına gelmez;
 * karar için hazırlık raporuna bakılır (kalibrasyon eşikleri K-A10 girilmeden kapı kapalıdır).
 */
export function CertificateGatePage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Sertifika kapısı"
        description="Sertifika düzenlenebilmesi için demetin iki farklı akademik onayı ve kalibrasyon koşullarının birlikte sağlanması gerekir. Bu ekran onayları ve kapının gerçek durumunu gösterir."
      />
      <PsychometricsTabs />
      <ApprovalCard />
      <ReadinessCard />
    </div>
  );
}

function ApprovalCard() {
  const { ready, request } = useCentralRequest();
  // Demet listesi `sku:manage` ister; yetki yoksa demet kimliği elle girilir.
  const bundles = useBundles({ query: { retry: false } });
  const certification = (bundles.data?.data ?? []).filter((b) => b.examPurpose === "CERTIFICATION" && b.id);
  const [manualId, setManualId] = useState("");
  const [pickedId, setPickedId] = useState("");
  const bundleId = pickedId || (isUuid(manualId) ? manualId.trim() : "");

  return (
    <FormCard title="Demet sertifika onayı" description="Yalnız CERTIFICATION tipi, sertifika bayrağı açık merkez demeti için iki FARKLI kişi onay verir; aynı kişi iki kez onaylayamaz.">
      {bundles.isSuccess && certification.length > 0 ? (
        <Field label="Sertifikasyon demeti">
          <Select value={pickedId} onChange={(e) => setPickedId(e.target.value)}>
            <option value="">Seçin</option>
            {certification.map((b) => (
              <option key={b.id} value={b.id}>
                {purposeLabel(b.examPurpose)} — {shortId(b.id)}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Demet kimliği (UUID)" hint={bundles.isError ? "Demet listesi alınamadı (yetki yok); kimliği elle girin" : "Sertifikasyon demetinin kimliği"} error={manualId && !isUuid(manualId) ? "Geçerli bir UUID girin" : undefined}>
          <Input value={manualId} onChange={(e) => setManualId(e.target.value)} placeholder="00000000-0000-…" />
        </Field>
      )}
      {bundleId && ready ? <ApprovalPanel key={bundleId} bundleId={bundleId} /> : null}
    </FormCard>
  );
}

export function ApprovalPanel({ bundleId }: { bundleId: string }) {
  const { ready, request } = useCentralRequest();
  const { user } = useAuth();
  const canManage = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const query = useApprovalStatus(bundleId, { query: { enabled: ready, retry: false }, request });
  const approve = useApproveCertificate({ request });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} message={approvalFailureMessage(query.error)} onRetry={() => void query.refetch()} compact />;
  const status = query.data?.data;
  if (!status) return null;

  const progress = approvalProgress(status);
  const conditions = bundleConditionsLabel(status);
  const approvals = status.approvals ?? [];
  const allowed = canManage && canGiveApproval(status, user?.userId);

  async function confirm(data: FormData) {
    const note = String(data.get("note") ?? "");
    const issue = validateNote(note);
    if (issue) return setError(issue);
    setError(undefined);
    try {
      await approve.mutateAsync({ bundleId, data: note.trim() ? { note: note.trim() } : {} });
      await queryClient.invalidateQueries({ queryKey: getApprovalStatusQueryKey(bundleId) });
      setConfirming(false);
    } catch (e) {
      setError(approvalFailureMessage(e));
    }
  }

  return (
    <div className="grid gap-3" aria-label="Onay durumu">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={progress.complete ? "success" : "warning"} dot>
          {progress.text}
        </Badge>
        <Badge tone={conditions.tone}>{conditions.label}</Badge>
        <Badge tone={status.certificateEnabledFlag ? "info" : "neutral"}>{status.certificateEnabledFlag ? "Demet bayrağı açık" : "Demet bayrağı kapalı"}</Badge>
      </div>
      <p role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2 text-[13px] text-fg-muted">
        Bu durum yalnız demet bayrağını ve onayları kapsar; kalibrasyon koşulları burada denetlenmez. “Demet koşulları sağlandı”, sertifika
        kapısının açık olduğu anlamına GELMEZ — gerçek durum için aşağıdaki hazırlık raporuna bakın.
      </p>
      {approvals.length === 0 ? (
        <p className="text-sm text-fg-muted">Henüz onay yok.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {approvals.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="font-medium text-fg">{approverLabel(a, user?.userId)}</span>
              <span className="text-xs text-fg-muted">
                {formatDateTime(a.approvedAt)}
                {a.note ? <span className="ml-2">“{a.note}”</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      {allowed ? (
        <div>
          <Button onClick={() => { setError(undefined); setConfirming(true); }}>Onay ver</Button>
        </div>
      ) : null}
      <FormDialog
        open={confirming}
        title="Sertifika açma onayı ver"
        description="Onayınız kayda geçer ve geri alınamaz. İkinci onay FARKLI bir kişiden olmalıdır."
        submitLabel="Onay ver"
        pending={approve.isPending}
        error={error}
        onClose={() => setConfirming(false)}
        onSubmit={(data) => void confirm(data)}
      >
        <Field label="Not" hint={`İsteğe bağlı, en çok ${NOTE_MAX} karakter`}>
          <Textarea name="note" rows={3} />
        </Field>
      </FormDialog>
    </div>
  );
}

function ReadinessCard() {
  const { ready, request } = useCentralRequest();
  const [examVersionId, setExamVersionId] = useState("");
  const [formId, setFormId] = useState("");
  const [submitted, setSubmitted] = useState<{ examVersionId: string; formId: string } | null>(null);
  const query = useQuery({
    queryKey: ["calibration-readiness", submitted?.examVersionId ?? "", submitted?.formId ?? ""],
    enabled: ready && submitted !== null,
    retry: false,
    queryFn: () => getCalibrationReadiness({ examVersionId: submitted?.examVersionId || undefined, formId: submitted?.formId || undefined }, request),
  });
  const formInvalid = formId !== "" && !isUuid(formId);
  const canSubmit = isUuid(examVersionId) && !formInvalid;

  return (
    <FormCard title="Kapı hazırlık raporu" description="Seçilen sınav sürümü (ve istenirse form) için kapının GERÇEK durumu: her koşulun okunan değeri, eşiği ve neden okunamadığı. Rapor kapıyı açmaz, hiçbir şey yazmaz.">
      <ExamVersionPicker value={examVersionId} onChange={setExamVersionId} />
      <Field label="Form kimliği (UUID)" hint="İsteğe bağlı; verilmezse sınav sürümünün tüm maddeleri" error={formInvalid ? "Geçerli bir UUID girin" : undefined}>
        <Input value={formId} onChange={(e) => setFormId(e.target.value)} placeholder="00000000-0000-…" />
      </Field>
      <div>
        <Button variant="secondary" disabled={!canSubmit} onClick={() => setSubmitted({ examVersionId: examVersionId.trim(), formId: formId.trim() })}>
          Raporu getir
        </Button>
      </div>
      {query.isFetching ? <Spinner /> : null}
      {query.isError ? <p role="alert" className="text-sm font-medium text-danger">{readinessFailureMessage(query.error)}</p> : null}
      {query.data && !query.isFetching ? <ReadinessReportView report={query.data} /> : null}
    </FormCard>
  );
}

export function ReadinessReportView({ report }: { report: ReadinessReport }) {
  const verdict = gateVerdict(report);
  const missing = missingConditions(report);
  const rows = readinessRows(report);
  const stateByName = new Map(report.conditions.map((c) => [c.name, c]));
  return (
    <div className="grid gap-3" aria-label="Kapı hazırlık raporu">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={verdict.tone} dot>
          {verdict.label}
        </Badge>
        {report.scope?.scoredItemCount !== undefined ? <span className="text-[13px] text-fg-muted">{report.scope.scoredItemCount} puanlanan madde</span> : null}
      </div>
      {!verdict.open && missing.length > 0 ? (
        <div role="status" className="rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-sm text-warning">
          <p className="font-semibold">Karşılanmayan koşullar</p>
          <ul className="mt-1 list-disc pl-5">
            {missing.map((c) => (
              <li key={c.name}>
                {conditionLabel(c.name)}
                {!c.thresholdDefined ? " — eşik tanımsız (akademik ekip eşikleri K-A10 ile girmedikçe kapı kapalı kalır)" : ""}
                {c.detail ? `: ${c.detail}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-neutral-50 text-left text-[11.5px] font-semibold text-fg-subtle">
              <th scope="col" className="px-3 py-2">Koşul</th>
              <th scope="col" className="px-3 py-2">Okunan değer</th>
              <th scope="col" className="px-3 py-2">Eşik</th>
              <th scope="col" className="px-3 py-2">Durum</th>
              <th scope="col" className="px-3 py-2">Not</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => {
              const cond = stateByName.get(row.name);
              const state = cond ? conditionState(cond) : null;
              return (
                <tr key={row.name}>
                  <td className="px-3 py-2 font-medium text-fg">{row.label}</td>
                  <td className="numeric px-3 py-2">{row.value}</td>
                  <td className="px-3 py-2 text-fg-muted">{row.threshold}</td>
                  <td className="px-3 py-2">{state ? <Badge tone={state.tone}>{state.label}</Badge> : "—"}</td>
                  <td className="px-3 py-2 text-xs text-fg-muted">{row.note ?? cond?.detail ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
