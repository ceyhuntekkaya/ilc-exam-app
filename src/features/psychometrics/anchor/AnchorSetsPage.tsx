"use client";

import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/components/auth-provider";
import {
  getList2QueryKey,
  useAddItem,
  useApprove,
  useCreate1,
  useList2,
  useRemoveItem,
  useRepublish,
  useRetire1,
  useReturnToDraft,
  useSubmitForReview,
} from "@/src/api/generated/anchor-setleri/anchor-setleri";
import type { AnchorSetView, CreateAnchorSetRequestBandFrom, CreateAnchorSetRequestBandTo } from "@/src/api/generated/models";
import { authoringApi } from "@/src/features/authoring/shared/client";
import { useCan } from "@/src/features/panel/PanelContext";
import {
  CEFR_ORDER,
  ANCHOR_STATUS_TONE,
  anchorActions,
  anchorItemsEditable,
  anchorStatusLabel,
  bandPairLabel,
  cefrLabel,
  selfApprovalWarning,
  shortId,
  validateAnchorForm,
  type AnchorAction,
  type AnchorActionSpec,
  type AnchorFormState,
} from "@/src/features/psychometrics/anchor/anchorModel";
import { QuestionVersionPicker, formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { Perm } from "@/src/lib/permissions";
import {
  Badge,
  Button,
  ConfirmDialog,
  DefinitionList,
  ErrorState,
  Field,
  FormCard,
  FormDialog,
  PageHeader,
  SectionTable,
  SectionToolbar,
  Select,
  Input,
  errorMessage,
  notify,
} from "@/src/ui";

/** R-15 (E-35): anchor seti yönetimi — liste, madde ekle/çıkar, incele-onayla akışı, durum rozetleri. */
export function AnchorSetsPage() {
  const { ready, request } = useCentralRequest();
  const canManage = useCan(Perm.psychometricsManage);
  const query = useList2({ query: { enabled: ready }, request });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = query.data?.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Anchor Setleri"
        description="Bant çifti ve dönem başına kalibrasyonu bağlayan madde kümeleri. Yalnız onaylı, yüksek riskli (SECURE) havuzdan, merkez kapsamlı maddeler eklenebilir; set dört göz ilkesiyle onaylanır."
      />
      <PsychometricsTabs />
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
      ) : (
        <SectionTable
          columns={["Bant çifti", "Dönem", "Durum", "Madde", "Oluşturulma", ""]}
          loading={query.isLoading || !ready}
          empty="Henüz anchor seti yok"
          emptyHint={canManage ? "“Yeni anchor seti” ile bir bant çifti ve dönem için taslak oluşturun." : "Bir set oluşturulduğunda burada listelenecektir."}
          emptyTone="neutral"
          toolbar={
            <SectionToolbar count={rows.length} noun="set" loading={query.isLoading}>
              {canManage ? <Button onClick={() => setCreating(true)}>Yeni anchor seti</Button> : null}
            </SectionToolbar>
          }
          rows={rows.map((row) => [
            bandPairLabel(row),
            row.period ?? "—",
            <Badge key="s" tone={ANCHOR_STATUS_TONE[row.status ?? ""] ?? "neutral"} dot>
              {anchorStatusLabel(row.status)}
            </Badge>,
            String(row.itemCount ?? 0),
            formatWhen(row.createdAt),
            <div key="a" className="flex justify-end">
              <Button size="sm" variant={row.id === selectedId ? "primary" : "secondary"} onClick={() => setSelectedId(row.id ?? null)}>
                {row.id === selectedId ? "Açık" : "Aç"}
              </Button>
            </div>,
          ])}
        />
      )}
      {selected ? <AnchorSetDetail key={selected.id} set={selected} /> : null}
      <CreateAnchorDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => setSelectedId(id ?? null)} />
    </div>
  );
}

export function CreateAnchorDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id?: string) => void }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const create = useCreate1({ request });
  const [form, setForm] = useState<AnchorFormState>({ bandFrom: "", bandTo: "", period: "" });
  const [error, setError] = useState<string | null>(null);
  const errors = validateAnchorForm(form);
  const [touched, setTouched] = useState(false);

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      const result = await create.mutateAsync({
        data: {
          bandFrom: form.bandFrom as CreateAnchorSetRequestBandFrom,
          bandTo: form.bandTo as CreateAnchorSetRequestBandTo,
          period: form.period.trim(),
        },
      });
      await queryClient.invalidateQueries({ queryKey: getList2QueryKey() });
      notify.success("Anchor seti oluşturuldu (taslak)");
      onCreated?.(result.data.id);
      setForm({ bandFrom: "", bandTo: "", period: "" });
      setTouched(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Anchor seti oluşturulamadı"));
    }
  }

  return (
    <FormDialog
      open={open}
      title="Yeni anchor seti"
      description="Bant çifti artan sırada olmalıdır. Bir bant çifti ve dönem için aynı anda tek aktif set olabilir."
      submitLabel="Oluştur"
      pending={create.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Başlangıç bandı" required error={touched ? errors.bandFrom : undefined}>
          <Select value={form.bandFrom} onChange={(e) => setForm({ ...form, bandFrom: e.target.value })}>
            <option value="">Seçin</option>
            {CEFR_ORDER.map((level) => (
              <option key={level} value={level}>
                {cefrLabel(level)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bitiş bandı" required error={touched ? errors.bandTo : undefined}>
          <Select value={form.bandTo} onChange={(e) => setForm({ ...form, bandTo: e.target.value })}>
            <option value="">Seçin</option>
            {CEFR_ORDER.map((level) => (
              <option key={level} value={level}>
                {cefrLabel(level)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Dönem" required hint="Örn. 2026-H1" error={touched ? errors.period : undefined}>
        <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
      </Field>
    </FormDialog>
  );
}

/** Madde sürümü kimliklerini kod/sürüm etiketine çözer (tek tek, önbellekli); çözülemezse kısa kimlik. */
function useItemLabels(ids: readonly string[]) {
  const { ready } = useCentralRequest();
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["anchor-item-label", id],
      queryFn: () => authoringApi.getQuestion(id),
      enabled: ready,
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  const map = new Map<string, string>();
  ids.forEach((id, index) => {
    const detail = results[index]?.data;
    map.set(id, detail ? `${detail.code} · v${detail.versionNo}` : shortId(id));
  });
  return map;
}

export function AnchorSetDetail({ set }: { set: AnchorSetView }) {
  const { request } = useCentralRequest();
  const { user } = useAuth();
  const canManage = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: getList2QueryKey() });

  const addItem = useAddItem({ request });
  const removeItem = useRemoveItem({ request });
  const submitReview = useSubmitForReview({ request });
  const approve = useApprove({ request });
  const returnToDraft = useReturnToDraft({ request });
  const retire = useRetire1({ request });
  const republish = useRepublish({ request });

  const [pending, setPending] = useState<AnchorActionSpec | null>(null);
  const [actionError, setActionError] = useState<string | undefined>();
  const [itemError, setItemError] = useState<string | null>(null);

  const itemIds = set.itemVersionIds ?? [];
  const labels = useItemLabels(itemIds);
  const editable = canManage && anchorItemsEditable(set.status);
  const actions = canManage ? anchorActions(set.status) : [];
  const warning = selfApprovalWarning(set, user?.userId, user?.userType === "SUPER_ADMIN");

  const runners: Record<AnchorAction, () => Promise<unknown>> = {
    "submit-review": () => submitReview.mutateAsync({ anchorSetId: set.id! }),
    approve: () => approve.mutateAsync({ anchorSetId: set.id! }),
    "return-to-draft": () => returnToDraft.mutateAsync({ anchorSetId: set.id! }),
    retire: () => retire.mutateAsync({ anchorSetId: set.id! }),
    republish: () => republish.mutateAsync({ anchorSetId: set.id! }),
  };

  async function confirm() {
    if (!pending) return;
    setActionError(undefined);
    try {
      await runners[pending.action]();
      await refresh();
      notify.success(`${pending.label}: tamamlandı`);
      setPending(null);
    } catch (e) {
      // 403/409 (dört göz, aktif set çakışması, uygunsuz madde) backend mesajıyla gösterilir.
      setActionError(errorMessage(e, "İşlem tamamlanamadı"));
    }
  }

  async function add(versionId: string) {
    setItemError(null);
    try {
      await addItem.mutateAsync({ anchorSetId: set.id!, questionVersionId: versionId });
      await refresh();
    } catch (e) {
      setItemError(errorMessage(e, "Madde eklenemedi"));
    }
  }

  async function remove(versionId: string) {
    setItemError(null);
    try {
      await removeItem.mutateAsync({ anchorSetId: set.id!, questionVersionId: versionId });
      await refresh();
    } catch (e) {
      setItemError(errorMessage(e, "Madde çıkarılamadı"));
    }
  }

  return (
    <FormCard
      title={`${bandPairLabel(set)} · ${set.period ?? ""}`}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={ANCHOR_STATUS_TONE[set.status ?? ""] ?? "neutral"} dot>
            {anchorStatusLabel(set.status)}
          </Badge>
          {actions.map((spec) => (
            <Button
              key={spec.action}
              size="sm"
              variant={spec.tone === "danger" ? "danger" : spec.action === "approve" || spec.action === "submit-review" ? "primary" : "secondary"}
              onClick={() => {
                setActionError(undefined);
                setPending(spec);
              }}
            >
              {spec.label}
            </Button>
          ))}
        </div>
      }
    >
      <DefinitionList
        items={[
          { term: "Oluşturulma", description: formatWhen(set.createdAt) },
          { term: "Onay", description: set.approvedAt ? `${formatWhen(set.approvedAt)}` : "Henüz onaylanmadı" },
          { term: "Yayından kaldırma", description: set.retiredAt ? formatWhen(set.retiredAt) : "—" },
        ]}
      />
      {warning ? (
        <p role="status" className="rounded-lg bg-warning-bg p-3 text-sm text-warning">
          {warning}
        </p>
      ) : null}
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-fg">Maddeler ({itemIds.length})</h3>
        {itemIds.length === 0 ? (
          <p className="text-sm text-fg-muted">Sette madde yok. Madde içermeyen set onaylanamaz.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {itemIds.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-mono text-xs">{labels.get(id)}</span>
                {editable ? (
                  <Button size="sm" variant="ghost" onClick={() => void remove(id)} disabled={removeItem.isPending} aria-label={`${labels.get(id)} maddesini çıkar`}>
                    Çıkar
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {itemError ? <p className="text-sm text-danger">{itemError}</p> : null}
        {!anchorItemsEditable(set.status) && canManage ? (
          <p className="text-[13px] text-fg-subtle">Madde ekleme ve çıkarma yalnız taslak durumunda yapılır.</p>
        ) : null}
      </div>
      {editable ? (
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Madde ekle</h3>
          <QuestionVersionPicker status="APPROVED" label="Onaylı madde ara" actionLabel="Ekle" excludeIds={itemIds} onPick={(row) => void add(row.versionId)} />
        </div>
      ) : null}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.label ?? ""}
        description={pending?.confirm}
        confirmLabel={pending?.label}
        tone={pending?.tone ?? "primary"}
        pending={runnersPending(submitReview, approve, returnToDraft, retire, republish)}
        error={actionError}
        onClose={() => setPending(null)}
        onConfirm={() => void confirm()}
      />
    </FormCard>
  );
}

function runnersPending(...mutations: Array<{ isPending: boolean }>) {
  return mutations.some((m) => m.isPending);
}
