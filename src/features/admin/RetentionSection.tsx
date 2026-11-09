"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getActiveHoldsQueryKey,
  getListPoliciesQueryKey,
  getStatus1QueryKey,
  useActiveHolds,
  useListPolicies,
  useOpenHold,
  useReleaseHold,
  useRun,
  useSetPolicy,
  useStatus1,
} from "@/src/api/generated/retention/retention";
import type { HoldView, RunReport } from "@/src/api/generated/models";
import {
  EXECUTE_PHRASE,
  HOLD_SCOPES,
  activeHolds,
  daysText,
  dataKindDef,
  dryRunBody,
  executeBody,
  holdFailureMessage,
  holdScopeLabel,
  isDryRunReport,
  policyFailureMessage,
  policyRows,
  realRunGate,
  runFailureMessage,
  runItems,
  runTotals,
  stateView,
  toSetPolicyRequest,
  validateDays,
  validateHold,
  validateOptionalCompany,
  validatePolicyReason,
  type PolicyRow,
} from "@/src/features/admin/retentionModel";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  FormCard,
  FormDialog,
  Input,
  Select,
  Skeleton,
  Textarea,
  notify,
} from "@/src/ui";

/**
 * R-24 (KVKK): saklama süresi paneli — politika tablosu, silme durumu, kuru/gerçek koşum ve yasal tutma.
 * Yetki sunucuda `retention:manage` + merkez; yazma düğmeleri yetkisizlere gösterilmez. Süre DEĞERİ önerilmez/doldurulmaz
 * (hukuki karar): ekran yalnız giriş ve gerekçe alanı sunar. GERÇEK SİLME geri alınamaz; kuru koşum varsayılandır.
 */
export function RetentionSection() {
  const canManage = useCan(Perm.retentionManage);
  return (
    <div className="grid gap-6">
      <StatusCard />
      <PoliciesCard canManage={canManage} />
      <RunCard canManage={canManage} />
      <HoldsCard canManage={canManage} />
    </div>
  );
}

// ── Durum ──────────────────────────────────────────────────────────────────────────────────────────

function StatusCard() {
  const status = useStatus1();
  if (status.isLoading) return <Skeleton className="h-24 rounded-xl" />;
  if (status.isError) return <ErrorState error={status.error} onRetry={() => void status.refetch()} title="Silme durumu alınamadı" compact />;
  const s = status.data?.data;
  const enabled = s?.executeEnabled === true;
  const waiting = s?.waitingForDecision ?? [];
  return (
    <section aria-label="Silme durumu" className="grid gap-3">
      {enabled ? (
        <div role="status" className="rounded-xl border border-warning/30 bg-warning-bg p-4 text-sm text-warning">
          <p className="font-semibold">Silme AÇIK</p>
          <p className="mt-1">Silme bayrağı sunucuda açık: zamanlanmış iş süresi dolan veriyi gerçekten siler/anonimleştirir. Silme geri alınamaz.</p>
        </div>
      ) : (
        <div role="status" className="rounded-xl border border-danger/30 bg-danger-bg p-4 text-sm text-danger">
          <p className="text-base font-bold">Silme KAPALI</p>
          <p className="mt-1">
            Silme bayrağı (execute-enabled) kapalı: zamanlanmış iş ve elle koşum yalnız KURU KOŞUM yapar, hiçbir veri silinmez. Bayrağı açmak, süre
            değerlerinin girilmesinden ayrı ve bilinçli bir operasyon adımıdır.
          </p>
        </div>
      )}
      {waiting.length > 0 ? (
        <p className="text-sm text-fg-muted">
          Karar bekleyen veri türleri (süre girilmedi, bu türlerde silme çalışmaz):{" "}
          <span className="font-medium text-fg">{waiting.map((k) => dataKindDef(k).label).join(", ")}</span>
        </p>
      ) : null}
      {s ? (
        <p className="text-xs text-fg-subtle">
          Koşum sınırları: parti {s.batchSize ?? "—"} · bir koşumda kurum ve veri türü başına en çok {s.maxPerRun ?? "—"} deneme · talep yanıt süresi {s.erasureDueDays ?? "—"} gün.
        </p>
      ) : null}
    </section>
  );
}

// ── Politikalar ────────────────────────────────────────────────────────────────────────────────────

function PoliciesCard({ canManage }: { canManage: boolean }) {
  const query = useListPolicies();
  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const rows = policyRows(query.data?.data);

  return (
    <FormCard
      title="Saklama süreleri (merkez varsayılanı)"
      description="Süre, sonucun yayınından itibaren sayılır; itiraz süresi saklama süresinden uzunsa itiraz süresi beklenir. Süre boşsa (süresiz) o veri türünde silme ÇALIŞMAZ."
    >
      {query.isLoading ? <Skeleton className="h-48 rounded-lg" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess ? (
        <ul className="divide-y divide-border" data-testid="policy-table">
          {rows.map(({ def, view }) => {
            const st = stateView(view?.state);
            return (
              <li key={def.code} data-testid={`policy-${def.code}`} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-start">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{def.label}</p>
                  <p className="text-[13px] text-fg-muted">{def.description}</p>
                  {def.warning ? (
                    <p role="note" className="mt-1 rounded-md bg-warning-bg px-2 py-1 text-xs text-warning">
                      {def.warning}
                    </p>
                  ) : null}
                  {view?.note ? <p className="mt-1 text-xs text-fg-muted">{view.note}</p> : null}
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-fg">{daysText(view?.retentionDays)}</span>
                    <Badge tone={st.tone} dot>
                      {st.label}
                    </Badge>
                  </p>
                  {view?.updatedAt ? <p className="text-xs text-fg-subtle">Son değişiklik: {formatDateTime(view.updatedAt)}</p> : null}
                </div>
                {canManage ? (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => setEditing({ def, view })}>
                      Süreyi gir / değiştir
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {editing ? <PolicyDialog row={editing} onClose={() => setEditing(null)} /> : null}
    </FormCard>
  );
}

function PolicyDialog({ row, onClose }: { row: PolicyRow; onClose: () => void }) {
  const set = useSetPolicy();
  const queryClient = useQueryClient();
  const [days, setDays] = useState(row.view?.retentionDays != null ? String(row.view.retentionDays) : "");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const daysCheck = validateDays(days);
  const reasonIssue = validatePolicyReason(reason);

  async function submit() {
    setTouched(true);
    if (daysCheck.error || reasonIssue) return;
    setError(null);
    try {
      await set.mutateAsync({ data: toSetPolicyRequest(row.def.code, daysCheck.value, reason) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListPoliciesQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getStatus1QueryKey() }),
      ]);
      notify.success("Saklama süresi kaydedildi");
      onClose();
    } catch (err) {
      setError(policyFailureMessage(err));
    }
  }

  return (
    <FormDialog
      open
      title={`${row.def.label} — saklama süresi`}
      description="Değer hukuki bir karardır; burada varsayılan ya da önerilen bir süre yoktur. Değişiklik denetim izine yazılır."
      submitLabel="Kaydet"
      pending={set.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      {row.def.warning ? (
        <p role="note" className="rounded-md bg-warning-bg px-3 py-2 text-[13px] text-warning">
          {row.def.warning}
        </p>
      ) : null}
      <Field
        label="Saklama süresi (gün)"
        hint="Boş bırakırsanız süresiz olur: bu veri türünde silme çalışmaz."
        error={touched ? (daysCheck.error ?? undefined) : undefined}
      >
        <Input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <Field label="Gerekçe" required hint="Hukuki dayanak / karar referansı" error={touched ? (reasonIssue ?? undefined) : undefined}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

// ── Koşum ──────────────────────────────────────────────────────────────────────────────────────────

function RunCard({ canManage }: { canManage: boolean }) {
  const status = useStatus1();
  const run = useRun();
  const [companyId, setCompanyId] = useState("");
  const [touched, setTouched] = useState(false);
  const [report, setReport] = useState<RunReport | null>(null);
  const [dryRunScope, setDryRunScope] = useState<string | null>(null);
  const [confirmReal, setConfirmReal] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const companyIssue = validateOptionalCompany(companyId);
  const gate = realRunGate({ executeEnabled: status.data?.data?.executeEnabled, dryRunScope, scope: companyId });

  async function dry() {
    setTouched(true);
    if (companyIssue) return;
    setError(undefined);
    try {
      const result = await run.mutateAsync({ data: dryRunBody(companyId) });
      setReport(result.data);
      setDryRunScope(companyId.trim());
      notify.success("Kuru koşum tamamlandı; hiçbir şey silinmedi");
    } catch (err) {
      notify.error(runFailureMessage(err));
    }
  }

  async function real() {
    setError(undefined);
    try {
      const result = await run.mutateAsync({ data: executeBody(companyId) });
      setReport(result.data);
      setConfirmReal(false);
      setDryRunScope(null);
      notify.success("Gerçek silme koşumu tamamlandı");
    } catch (err) {
      setError(runFailureMessage(err));
    }
  }

  const items = runItems(report);
  const totals = runTotals(items);
  const dry_ = isDryRunReport(report);

  return (
    <FormCard
      title="Saklama koşumu"
      description="Kuru koşum, süresi dolan ve kapısı açık veriyi SAYAR; hiçbir şeyi silmez. Önce kuru koşumla doğrulayın. Dar bir kurumda pilot koşum için kurum kimliği girilebilir."
    >
      {canManage ? (
        <div className="grid gap-4">
          <Field label="Kurum kimliği (isteğe bağlı)" hint="Boş = tüm kurumlar" error={touched ? (companyIssue ?? undefined) : undefined}>
            <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void dry()} loading={run.isPending && !confirmReal}>
              Kuru koşum yap
            </Button>
            <span className="text-xs text-fg-muted">Silmez; yalnız neyin silineceğini sayar.</span>
          </div>

          <div className="grid gap-2 rounded-lg border border-danger/30 bg-danger-bg/40 p-3">
            <p className="text-sm font-semibold text-danger">Gerçek silme — geri alınamaz</p>
            <p className="text-[13px] text-fg-muted">
              Silinen ses/fotoğraf dosyaları, yanıt içerikleri ve olay günlüğü geri getirilemez. Puan, sonuç, sertifika, hak defteri, ödeme ve rıza kayıtları
              silinmez.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="danger" disabled={!gate.allowed || run.isPending} onClick={() => setConfirmReal(true)}>
                Gerçek silmeyi başlat…
              </Button>
              {gate.reason ? (
                <span role="note" className="text-xs font-medium text-danger">
                  {gate.reason}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted">Koşum yetkiniz yok.</p>
      )}

      {report ? (
        <div className="mt-4 grid gap-2" data-testid="run-report">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={dry_ ? "info" : "danger"} dot>
              {dry_ ? "Kuru koşum — hiçbir şey silinmedi" : "Gerçek silme yapıldı"}
            </Badge>
            <span className="text-xs text-fg-muted">
              {dry_ ? "Silinecek" : "Uygun"} {totals.eligible} · korunan (tutma/itiraz) {totals.blocked} · silinen {totals.erased} · hata {totals.failed} · süre yok {totals.skipped}
            </span>
          </div>
          {items.length === 0 ? (
            <EmptyState tone="neutral" compact title="Koşum satırı yok" description="Hiçbir veri türü için aday bulunmadı." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11.5px] font-semibold text-fg-subtle">
                    <th scope="col" className="px-3 py-2">Veri türü</th>
                    <th scope="col" className="px-3 py-2">Kurum</th>
                    <th scope="col" className="px-3 py-2 text-right">Süre</th>
                    <th scope="col" className="px-3 py-2 text-right">{dry_ ? "Silinecek" : "Uygun"}</th>
                    <th scope="col" className="px-3 py-2 text-right">Korunan</th>
                    <th scope="col" className="px-3 py-2 text-right">Silinen</th>
                    <th scope="col" className="px-3 py-2 text-right">Hata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((i, idx) => (
                    <tr key={`${i.dataKind}-${i.companyId}-${idx}`}>
                      <td className="px-3 py-2">{dataKindDef(i.dataKind).label}</td>
                      <td className="px-3 py-2 font-mono text-xs" title={i.companyId ?? undefined}>
                        {i.companyId ? i.companyId.slice(0, 8) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {i.skippedNoPolicy ? <Badge tone="warning">Süre yok — çalışmadı</Badge> : daysText(i.retentionDays)}
                      </td>
                      <td className="numeric px-3 py-2 text-right">{i.eligible ?? 0}</td>
                      <td className="numeric px-3 py-2 text-right">{i.blocked ?? 0}</td>
                      <td className="numeric px-3 py-2 text-right">{i.erased ?? 0}</td>
                      <td className="numeric px-3 py-2 text-right">{i.failed ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmReal}
        title="Gerçek silme başlatılsın mı?"
        description={
          <>
            <p>
              Süresi dolan ve kapısı açık veri {companyId.trim() ? "bu kurumda" : "TÜM kurumlarda"} GERÇEKTEN silinecek/anonimleştirilecek. Bu işlem{" "}
              <strong>geri alınamaz</strong>.
            </p>
            <p className="mt-2">Yasal tutma, açık itiraz/inceleme ve itiraz süresi dolmamış sonuçlar korunur. Kuru koşum sonucunu incelediğinizden emin olun.</p>
          </>
        }
        confirmLabel="Evet, kalıcı olarak sil"
        confirmPhrase={EXECUTE_PHRASE}
        pending={run.isPending}
        error={error}
        onClose={() => setConfirmReal(false)}
        onConfirm={() => void real()}
      />
    </FormCard>
  );
}

// ── Yasal tutma ────────────────────────────────────────────────────────────────────────────────────

function HoldsCard({ canManage }: { canManage: boolean }) {
  const query = useActiveHolds();
  const [opening, setOpening] = useState(false);
  const [releasing, setReleasing] = useState<HoldView | null>(null);
  const holds = activeHolds(query.data?.data);

  return (
    <FormCard
      title="Yasal tutma"
      description="Tutma altındaki kayıt süresi dolsa bile silinmez. Açık itirazı olan denemenin tutması, itiraz dosyası kapanmadan bırakılamaz."
      aside={
        canManage ? (
          <Button size="sm" onClick={() => setOpening(true)}>
            Yasal tutma koy
          </Button>
        ) : null
      }
    >
      {query.isLoading ? <Skeleton className="h-16 rounded-lg" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess && holds.length === 0 ? (
        <EmptyState tone="neutral" compact title="Aktif yasal tutma yok" description="Bir deneme, aday veya kurum üzerinde tutma konulduğunda burada listelenir." />
      ) : null}
      {holds.length > 0 ? (
        <ul className="divide-y divide-border" data-testid="holds">
          {holds.map((h) => (
            <li key={h.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-fg">
                  {holdScopeLabel(h.scopeType)} <span className="font-mono text-xs text-fg-muted">{h.scopeId}</span>
                </p>
                <p className="text-[13px] text-fg-muted">{h.reason}</p>
                <p className="text-xs text-fg-subtle">Konuldu: {formatDateTime(h.createdAt)}</p>
              </div>
              {canManage ? (
                <Button size="sm" variant="secondary" onClick={() => setReleasing(h)}>
                  Tutmayı bırak
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {opening ? <OpenHoldDialog onClose={() => setOpening(false)} /> : null}
      {releasing ? <ReleaseHoldDialog hold={releasing} onClose={() => setReleasing(null)} /> : null}
    </FormCard>
  );
}

function OpenHoldDialog({ onClose }: { onClose: () => void }) {
  const open = useOpenHold();
  const queryClient = useQueryClient();
  const [scopeType, setScopeType] = useState<(typeof HOLD_SCOPES)[number]["value"]>("APPLICATION");
  const [scopeId, setScopeId] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const issues = validateHold(scopeId, reason);

  async function submit() {
    setTouched(true);
    if (issues.scopeId || issues.reason) return;
    setError(null);
    try {
      await open.mutateAsync({ data: { scopeType, scopeId: scopeId.trim(), reason: reason.trim() } });
      await queryClient.invalidateQueries({ queryKey: getActiveHoldsQueryKey() });
      notify.success("Yasal tutma konuldu");
      onClose();
    } catch (err) {
      setError(holdFailureMessage(err, "Yasal tutma konulamadı"));
    }
  }

  return (
    <FormDialog open title="Yasal tutma koy" description="Tutma altındaki kayıt hiçbir silme yoluyla silinmez." submitLabel="Tutma koy" pending={open.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <Field label="Kapsam" required>
        <Select value={scopeType} onChange={(e) => setScopeType(e.target.value as typeof scopeType)}>
          {HOLD_SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.hint}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kapsam kimliği (UUID)" required error={touched ? issues.scopeId : undefined}>
        <Input value={scopeId} onChange={(e) => setScopeId(e.target.value)} />
      </Field>
      <Field label="Gerekçe" required error={touched ? issues.reason : undefined}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function ReleaseHoldDialog({ hold, onClose }: { hold: HoldView; onClose: () => void }) {
  const release = useReleaseHold();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | undefined>();

  async function confirm(reason: string) {
    if (!hold.id) return;
    setError(undefined);
    try {
      await release.mutateAsync({ id: hold.id, data: { reason: reason.trim() } });
      await queryClient.invalidateQueries({ queryKey: getActiveHoldsQueryKey() });
      notify.success("Yasal tutma bırakıldı");
      onClose();
    } catch (err) {
      // Açık itirazlı denemede 409: sunucu mesajı aynen ("önce itiraz dosyası kapatılmalı").
      setError(holdFailureMessage(err, "Yasal tutma bırakılamadı"));
    }
  }

  return (
    <ConfirmDialog
      open
      tone="primary"
      title="Yasal tutma bırakılsın mı?"
      description="Tutma kalkınca bu kayıt, süresi dolmuşsa bir sonraki koşumda silinebilir."
      confirmLabel="Tutmayı bırak"
      reasonRequired
      reasonLabel="Bırakma gerekçesi"
      pending={release.isPending}
      error={error}
      onClose={onClose}
      onConfirm={({ reason }) => void confirm(reason)}
    />
  );
}

