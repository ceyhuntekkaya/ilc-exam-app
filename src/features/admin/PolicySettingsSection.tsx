"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getList1QueryKey, useChange, useHistory, useList1 } from "@/src/api/generated/policy-settings/policy-settings";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import {
  SOON_MINUTES,
  defOf,
  effectiveValue,
  groupedDefs,
  historyChange,
  normalizeValue,
  policyFailureMessage,
  resolveEffectiveFrom,
  scheduledSettings,
  toChangeRequest,
  validateReason,
  displayValue,
  type EffectiveMode,
  type KeyDef,
} from "@/src/features/admin/policySettingsModel";
import { useCan } from "@/src/features/panel/PanelContext";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ErrorState, Field, FormCard, FormDialog, Input, Select, Skeleton, Textarea, notify } from "@/src/ui";

/**
 * R-19 (F6-00): politika ayar paneli — hukuki/ticari süreler ve oranlar kodla değil panelden yönetilir. R-27 hukuki süreleri
 * bu panele dolduracak. Kapsam GLOBAL (kurum/SKU düzeyi sonraki iş). Her değişiklik YENİ SÜRÜM açar; eski satır silinmez,
 * geçmiş görünür. Yürürlük tarihi geçmişe konamaz; "hemen" birkaç dakika ilerisine yazılır. Gerekçe zorunlu.
 * Yetki sunucuda `center:manage`; yazma düğmeleri yetkisizlere gösterilmez.
 */
export function PolicySettingsSection() {
  const canManage = useCan(Perm.centerManage);
  return (
    <div className="grid gap-6">
      <div role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
        “Tanımsız” (boş) bir değer, ilgili özelliğin henüz karara bağlanmadığını ya da kapalı olduğunu gösterir; her ayarın boşluğunun anlamı
        açıklamasında yazar. Ticari ya da hukuki karar bekleyen ayarlar uyarıyla işaretlidir.
      </div>
      {groupedDefs().map(({ group, defs }) => (
        <FormCard key={group} title={group}>
          <ul className="divide-y divide-border">
            {defs.map((def) => (
              <SettingRow key={def.key} def={def} canManage={canManage} />
            ))}
          </ul>
        </FormCard>
      ))}
    </div>
  );
}

function SettingRow({ def, canManage }: { def: KeyDef; canManage: boolean }) {
  const query = useList1(def.key, { scope: "GLOBAL" });
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const rows = query.data?.data ?? [];
  const view = effectiveValue(def, rows);
  const scheduled = scheduledSettings(rows);

  return (
    <li className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center" data-testid={`setting-${def.key}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{def.label}</p>
        <p className="text-[13px] text-fg-muted">{def.description}</p>
        {def.nullable && def.nullMeaning ? <p className="text-xs text-fg-subtle">{def.nullMeaning}</p> : null}
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          {query.isLoading ? (
            <Skeleton className="h-5 w-24 rounded" />
          ) : query.isError ? (
            <span className="text-danger">Değer okunamadı</span>
          ) : (
            <>
              <span className="font-semibold text-fg">{view.text}</span>
              {view.source === "fallback" ? <Badge tone="neutral">Kod varsayılanı</Badge> : null}
              {view.pending ? <Badge tone="warning">{def.pendingDecision === "hukuki" ? "Hukuki karar bekliyor" : "Ticari karar bekliyor"}</Badge> : null}
            </>
          )}
        </p>
        {scheduled.map((s) => (
          <p key={s.id} className="text-xs text-info">
            Planlı: {s.value === undefined || s.value === null ? "Tanımsız" : displayValue(def, s.value)} — {formatDateTime(s.effectiveFrom)} tarihinde yürürlüğe girer
          </p>
        ))}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setHistory(true)}>
          Geçmiş
        </Button>
        {canManage ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)} disabled={query.isLoading}>
            Değiştir
          </Button>
        ) : null}
      </div>
      {editing ? <EditDialog def={def} current={rows.length > 0 ? view.text : undefined} onClose={() => setEditing(false)} /> : null}
      {history ? <HistoryDialog def={def} onClose={() => setHistory(false)} /> : null}
    </li>
  );
}

function EditDialog({ def, current, onClose }: { def: KeyDef; current?: string; onClose: () => void }) {
  const change = useChange();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<EffectiveMode>("soon");
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valueCheck = normalizeValue(def, value);
  const whenCheck = resolveEffectiveFrom(mode, when);
  const reasonIssue = validateReason(reason);

  async function submit() {
    setTouched(true);
    if (valueCheck.error || whenCheck.error || reasonIssue || !whenCheck.iso) return;
    setError(null);
    try {
      await change.mutateAsync({ key: def.key, data: toChangeRequest(valueCheck.value, whenCheck.iso, reason) });
      await queryClient.invalidateQueries({ queryKey: getList1QueryKey(def.key, { scope: "GLOBAL" }) });
      notify.success("Yeni sürüm kaydedildi");
      onClose();
    } catch (err) {
      setError(policyFailureMessage(err));
    }
  }

  return (
    <FormDialog
      open
      title={`${def.label} — değiştir`}
      description={`Değişiklik yeni bir sürüm açar; eski değer geçmişte kalır.${current ? ` Şu anki değer: ${current}.` : ""}`}
      submitLabel="Kaydet"
      pending={change.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field
        label={`Yeni değer${def.unit ? ` (${def.unit})` : ""}`}
        required={!def.nullable}
        hint={def.nullable ? `Boş bırakırsanız ayar tanımsız olur. ${def.nullMeaning ?? ""}` : undefined}
        error={touched ? (valueCheck.error ?? undefined) : undefined}
      >
        {def.options ? (
          <Select value={value} onChange={(e) => setValue(e.target.value)}>
            <option value="">Seçin</option>
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <Input inputMode={def.type === "STRING" ? "text" : "decimal"} value={value} onChange={(e) => setValue(e.target.value)} />
        )}
      </Field>
      <Field label="Yürürlük" required hint="Yürürlük tarihi geçmişe konamaz">
        <Select value={mode} onChange={(e) => setMode(e.target.value as EffectiveMode)}>
          <option value="soon">Hemen ({SOON_MINUTES} dakika içinde)</option>
          <option value="scheduled">İleri bir tarihte</option>
        </Select>
      </Field>
      {mode === "scheduled" ? (
        <Field label="Yürürlük tarihi" required error={touched ? (whenCheck.error ?? undefined) : undefined}>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
      ) : null}
      <Field label="Değişiklik gerekçesi" required error={touched ? (reasonIssue ?? undefined) : undefined}>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

function HistoryDialog({ def, onClose }: { def: KeyDef; onClose: () => void }) {
  const query = useHistory(def.key, { scope: "GLOBAL" });
  const rows = query.data?.data ?? [];
  return (
    <FormDialog open title={`${def.label} — değişiklik geçmişi`} submitLabel="Kapat" onClose={onClose} onSubmit={onClose}>
      {query.isLoading ? <Skeleton className="h-16 rounded" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {query.isSuccess && rows.length === 0 ? <p className="text-sm text-fg-muted">Henüz değişiklik kaydı yok.</p> : null}
      {rows.length > 0 ? (
        <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {rows.map((h) => (
            <li key={h.id} className="grid gap-0.5 px-3 py-2 text-sm">
              <span className="font-medium text-fg">{historyChange(h, defOf(h.key) ?? def)}</span>
              <span className="text-xs text-fg-muted">
                {formatDateTime(h.changedAt)} · Kullanıcı {h.changedBy?.slice(0, 8) ?? "—"}
              </span>
              {h.reason ? <span className="text-xs text-fg-muted">Gerekçe: {h.reason}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </FormDialog>
  );
}
