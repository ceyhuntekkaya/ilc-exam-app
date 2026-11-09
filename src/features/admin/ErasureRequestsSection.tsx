"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getList7QueryKey, useExecute, useList7 as useErasureRequests, useReject1 } from "@/src/api/generated/erasure-requests/erasure-requests";
import type { Execution, RequestView } from "@/src/api/generated/models";
import {
  ERASURE_FILTERS,
  EXECUTE_PHRASE,
  appStatusView,
  blockerText,
  canActOnRequest,
  canExecuteRequest,
  canWaive,
  dataKindDef,
  erasureFailureMessage,
  executionStatusView,
  requestStatusView,
  summarizeExecution,
  toExecuteBody,
  validateWaiver,
  viaLabel,
} from "@/src/features/admin/retentionModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, ErrorState, Field, FilterTabs, FormCard, SectionTable, SectionToolbar, Textarea, notify } from "@/src/ui";

const shortId = (id?: string | null) => (id ? id.slice(0, 8) : "—");

/**
 * R-24: talep üzerine silme — merkez listesi ve yürütme. Açma ≠ silme: aday/personel talep açar, YÜRÜTME yalnız merkez
 * (`erasure:manage`). Yürütme varsayılan KURU KOŞUMdur; gerçek yürütme (geri alınamaz) kuru koşum görülmeden açılmaz.
 * Puan, sonuç, sertifika, hak defteri/ödeme ve rıza kayıtları silinmez ("korunanlar" gerekçesiyle gösterilir).
 */
export function ErasureRequestsSection() {
  const canManage = useCan(Perm.erasureManage);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const params = filter ? { status: filter as never } : undefined;
  const query = useErasureRequests(params);
  const [selected, setSelected] = useState<RequestView | null>(null);
  const [rejecting, setRejecting] = useState<RequestView | null>(null);
  const reject = useReject1();
  const [rejectError, setRejectError] = useState<string | undefined>();
  const rows: RequestView[] = query.data?.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getList7QueryKey(params) });
  }

  async function confirmReject(reason: string) {
    if (!rejecting?.id) return;
    setRejectError(undefined);
    try {
      await reject.mutateAsync({ id: rejecting.id, data: { reason: reason.trim() } });
      notify.success("Talep reddedildi");
      setRejecting(null);
      if (selected?.id === rejecting.id) setSelected(null);
      await refresh();
    } catch (err) {
      setRejectError(erasureFailureMessage(err, "Talep reddedilemedi"));
    }
  }

  return (
    <div className="grid gap-4">
      <FormCard
        title="Silme talepleri"
        description="Talep açmak hiçbir şey silmez. Yürütmeden önce kuru koşumla neyin silineceğini ve neyin engelli olduğunu görün. Yanıt süresi dolan talepler “gecikmiş” işaretlenir."
      >
        {query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
        ) : (
          <SectionTable
            loading={query.isLoading}
            tabs={<FilterTabs label="Talep durumu" items={ERASURE_FILTERS.map((f) => ({ label: f.label, value: f.value }))} value={filter} onChange={setFilter} />}
            toolbar={<SectionToolbar count={rows.length} noun="talep" loading={query.isLoading} />}
            columns={["Talep", "Kişi", "Açan", "Durum", "Tarih", "Son yanıt", ""]}
            empty="Silme talebi yok"
            emptyHint="Bir aday ya da kurum personeli talep açtığında burada listelenir."
            emptyTone="neutral"
            rows={rows.map((r) => {
              const st = requestStatusView(r.status);
              return [
                <span key="i" className="font-mono text-xs" title={r.id}>
                  {shortId(r.id)}
                </span>,
                <span key="u" className="font-mono text-xs" title={r.subjectUserId}>
                  {shortId(r.subjectUserId)}
                </span>,
                viaLabel(r.requestedVia),
                <div key="s" className="grid gap-1">
                  <Badge tone={st.tone} dot>
                    {st.label}
                  </Badge>
                  {r.overdue ? <Badge tone="danger">Gecikmiş</Badge> : null}
                </div>,
                <span key="c" className="text-xs text-fg-muted">
                  {formatDateTime(r.createdAt)}
                </span>,
                <span key="d" className="text-xs text-fg-muted">
                  {formatDateTime(r.dueAt)}
                </span>,
                <div key="a" className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                    {canManage && canActOnRequest(r) ? "İncele / yürüt" : "Ayrıntı"}
                  </Button>
                  {canManage && canActOnRequest(r) ? (
                    <Button size="sm" variant="ghost" onClick={() => { setRejectError(undefined); setRejecting(r); }}>
                      Reddet
                    </Button>
                  ) : null}
                </div>,
              ];
            })}
          />
        )}
      </FormCard>
      {selected ? <RequestPanel key={selected.id} request={selected} canManage={canManage} onChanged={() => void refresh()} onClose={() => setSelected(null)} /> : null}
      <ConfirmDialog
        open={rejecting !== null}
        tone="danger"
        title="Silme talebi reddedilsin mi?"
        description="Talep kapanır; kişinin verisi silinmez. Gerekçe kayda geçer ve adaya gösterilebilir."
        confirmLabel="Reddet"
        reasonRequired
        reasonLabel="Ret gerekçesi"
        pending={reject.isPending}
        error={rejectError}
        onClose={() => setRejecting(null)}
        onConfirm={({ reason }) => void confirmReject(reason)}
      />
    </div>
  );
}

function RequestPanel({ request, canManage, onChanged, onClose }: { request: RequestView; canManage: boolean; onChanged: () => void; onClose: () => void }) {
  const execute = useExecute();
  const [preview, setPreview] = useState<{ execution: Execution; key: string } | null>(null);
  const [final, setFinal] = useState<Execution | null>(null);
  const [waive, setWaive] = useState<string[]>([]);
  const [waiverReason, setWaiverReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const st = requestStatusView(request.status);
  const waiverIssue = validateWaiver(waive, waiverReason);
  const currentKey = [...waive].sort().join(",") + "|" + waiverReason.trim();
  // Karar (seçim/gerekçe) kuru koşumdan sonra değiştiyse gerçek yürütme için yeniden kuru koşum gerekir.
  const previewCurrent = preview !== null && preview.key === currentKey;
  const canRun = canExecuteRequest({ request, previewedRequestId: previewCurrent ? (request.id ?? null) : null, previewDryRun: preview?.execution.dryRun === true });

  async function runPreview() {
    setTouched(true);
    if (waiverIssue || !request.id) return;
    setError(undefined);
    try {
      const result = await execute.mutateAsync({ id: request.id, data: toExecuteBody({ dryRun: true, waive, waiverReason }) });
      setPreview({ execution: result.data, key: currentKey });
      setFinal(null);
    } catch (err) {
      notify.error(erasureFailureMessage(err, "Kuru koşum yapılamadı"));
    }
  }

  async function runReal() {
    if (!request.id) return;
    setError(undefined);
    try {
      const result = await execute.mutateAsync({ id: request.id, data: toExecuteBody({ dryRun: false, waive, waiverReason }) });
      setFinal(result.data);
      setPreview(null);
      setConfirming(false);
      notify.success(result.data.status === "COMPLETED" ? "Talep tamamlandı" : "Talep yürütüldü");
      onChanged();
    } catch (err) {
      setError(erasureFailureMessage(err, "Yürütme başarısız"));
    }
  }

  const shown = final ?? preview?.execution ?? null;

  return (
    <FormCard
      title={`Talep ${shortId(request.id)} — ${viaLabel(request.requestedVia)}`}
      description={request.reason ? `Aday açıklaması: ${request.reason}` : "Aday açıklama yazmadı."}
      aside={
        <Button size="sm" variant="ghost" onClick={onClose}>
          Kapat
        </Button>
      }
    >
      <div className="grid gap-4" data-testid="request-panel">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={st.tone} dot>
            {st.label}
          </Badge>
          {request.overdue ? <Badge tone="danger">Gecikmiş</Badge> : null}
          <span className="text-xs text-fg-muted">Son yanıt tarihi: {formatDateTime(request.dueAt)}</span>
          {request.rejectedReason ? <span className="text-xs text-danger">Ret gerekçesi: {request.rejectedReason}</span> : null}
        </div>

        {canManage && canActOnRequest(request) ? (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void runPreview()} loading={execute.isPending && !confirming}>
                Kuru koşum (önizleme)
              </Button>
              <span className="text-xs text-fg-muted">Hiçbir şey silmez; neyin silineceğini ve engelleri gösterir.</span>
            </div>
            {preview && waive.length > 0 ? (
              <Field label="Yerleşmemiş denemeyi silme kararının gerekçesi" required error={touched ? (waiverIssue ?? undefined) : undefined} hint="En çok 500 karakter; denetim kaydına yazılır.">
                <Textarea rows={2} value={waiverReason} onChange={(e) => setWaiverReason(e.target.value)} />
              </Field>
            ) : null}
            <div className="grid gap-2 rounded-lg border border-danger/30 bg-danger-bg/40 p-3">
              <p className="text-sm font-semibold text-danger">Gerçek yürütme — geri alınamaz</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="danger" disabled={!canRun || execute.isPending} onClick={() => setConfirming(true)}>
                  Gerçek silmeyi yürüt…
                </Button>
                {!canRun ? (
                  <span role="note" className="text-xs font-medium text-danger">
                    {preview && !previewCurrent ? "Karar değişti: yeniden kuru koşum yapın." : "Önce kuru koşum yapın ve sonucu inceleyin."}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {shown ? (
          <ExecutionView
            execution={shown}
            canDecide={canManage && preview !== null && final === null}
            waive={waive}
            onToggleWaive={(id) => setWaive((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        title="Gerçek silme yürütülsün mü?"
        description={
          <>
            <p>
              Kişinin engelsiz denemelerindeki ses, fotoğraf, yanıt içeriği ve olay günlüğü kalıcı olarak silinecek; tüm denemeler kapıdan geçerse hesap
              kimliği anonimleştirilecek. Bu işlem <strong>geri alınamaz</strong>.
            </p>
            <p className="mt-2">Puan, sonuç, sertifika, hak defteri/ödeme ve rıza kayıtları silinmez.</p>
          </>
        }
        confirmLabel="Evet, kalıcı olarak sil"
        confirmPhrase={EXECUTE_PHRASE}
        pending={execute.isPending}
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={() => void runReal()}
      />
    </FormCard>
  );
}

export function ExecutionView({ execution, canDecide = false, waive = [], onToggleWaive }: { execution: Execution; canDecide?: boolean; waive?: string[]; onToggleWaive?: (applicationId: string) => void }) {
  const status = executionStatusView(execution.status);
  const summary = summarizeExecution(execution);
  const apps = execution.applications ?? [];
  const retained = execution.retained ?? [];
  const linked = execution.linkedAccounts ?? [];
  const identity = Object.entries(execution.identity ?? {});
  return (
    <section aria-label="Yürütme sonucu" className="grid gap-3" data-testid="execution-view">
      <div className="rounded-lg border border-border bg-neutral-50/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
          <span className="text-xs text-fg-muted">
            {summary.applications} deneme · silinen {summary.erased} · engelli {summary.blocked} · hata {summary.failed}
          </span>
        </div>
        {status.description ? <p className="mt-1.5 text-[13px] text-fg-muted">{status.description}</p> : null}
      </div>

      {apps.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
                <th scope="col" className="px-3 py-2">Deneme</th>
                <th scope="col" className="px-3 py-2">Sonuç</th>
                <th scope="col" className="px-3 py-2">Engel</th>
                <th scope="col" className="px-3 py-2">Silinecek / silinen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apps.map((a, i) => {
                const st = appStatusView(a.status);
                const blocker = blockerText(a.blocker);
                const counts = Object.entries(a.counts ?? {});
                return (
                  <tr key={`${a.applicationId}-${i}`}>
                    <td className="px-3 py-2 font-mono text-xs" title={a.applicationId}>
                      {shortId(a.applicationId)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-[13px]">
                      {blocker ?? "—"}
                      {canDecide && a.applicationId && canWaive(a) ? (
                        <label className="mt-1 flex items-start gap-2 text-xs text-fg-muted">
                          <input type="checkbox" checked={waive.includes(a.applicationId)} onChange={() => onToggleWaive?.(a.applicationId!)} />
                          <span>
                            Yerleşmemiş denemeyi de sil (gerekçeli karar). Yayınlanmış sonucun itiraz süresi, yasal tutma ve açık itiraz bu kararla kalkmaz.
                          </span>
                        </label>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-[13px] text-fg-muted">
                      {(a.wouldErase ?? []).length > 0 ? (a.wouldErase ?? []).map((k) => dataKindDef(k).label).join(", ") : null}
                      {counts.length > 0 ? counts.map(([k, v]) => `${dataKindDef(k).label}: ${v}`).join(", ") : null}
                      {(a.wouldErase ?? []).length === 0 && counts.length === 0 ? "—" : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Bu kişinin silinecek denemesi bulunamadı.</p>
      )}

      {identity.length > 0 ? (
        <p className="text-xs text-fg-muted">Kimlik anonimleştirme: {identity.map(([k, v]) => `${k}: ${v}`).join(", ")}</p>
      ) : null}

      {linked.length > 0 ? (
        <div role="note" className="rounded-lg bg-warning-bg p-3 text-[13px] text-warning">
          Aynı kimliğe bağlı DİĞER hesaplar var; bu talep yalnız talebin öznesini kapsar, bu hesaplar otomatik silinmez (ayrı talep gerekir):{" "}
          {linked.map((l) => `${l.userType ?? "hesap"} ${shortId(l.userId)}`).join(", ")}
        </div>
      ) : null}

      {retained.length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Bilerek korunanlar (silinmez) ve gerekçesi</h3>
          <ul className="grid gap-1 text-[13px] text-fg-muted" data-testid="retained">
            {retained.map((r, i) => (
              <li key={`${r.category}-${i}`}>
                <span className="font-medium text-fg">{retainedLabel(r.category)}:</span> {r.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const RETAINED_LABELS: Record<string, string> = {
  RESULT: "Puan ve sonuç",
  CERTIFICATE: "Sertifika",
  LEDGER: "Ödeme ve hak defteri",
  CONSENT: "Rıza kayıtları",
  AUDIT: "Denetim günlüğü",
};

function retainedLabel(category?: string): string {
  return RETAINED_LABELS[category ?? ""] ?? category ?? "—";
}
