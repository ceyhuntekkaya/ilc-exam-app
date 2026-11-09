"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/components/auth-provider";
import {
  getListCutScoresQueryKey,
  useApproveCutScore,
  useListCutScores,
  useProposeCutScore,
} from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { CutScoreView } from "@/src/api/generated/models";
import { useCan } from "@/src/features/panel/PanelContext";
import { CEFR_ORDER, cefrLabel } from "@/src/features/psychometrics/anchor/anchorModel";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import {
  BOUNDARY_LABEL,
  REQUIRED_APPROVALS,
  canApproveCut,
  cutApprovalState,
  formatNumber,
  isUuid,
  toProposeRequest,
  validateCutForm,
  type CutFormState,
} from "@/src/features/standard-setting/model";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, ErrorState, Field, FormCard, FormDialog, Input, Select, errorMessage, notify } from "@/src/ui";

const EMPTY_FORM: CutFormState = { scaleVersionId: "", band: "", boundaryKind: "", cut: "", sem: "", effectiveFrom: "" };

/**
 * Kesme puanı sürümleri: öneri + iki FARKLI kişinin onayı. Sonlandırılmış çalışmadan açılınca çalışma sonucu forma gelir.
 * Ölçek sürümlerini listeleyen bir uç yok; ölçek sürümü kimliği elle girilir.
 */
export function CutScorePanel({ studyId, finalCut, finalSem }: { studyId?: string; finalCut?: number; finalSem?: number }) {
  const { ready, request } = useCentralRequest();
  const canManage = useCan(Perm.psychometricsManage);
  const [scaleInput, setScaleInput] = useState("");
  const [scaleVersionId, setScaleVersionId] = useState("");
  const [proposing, setProposing] = useState(false);
  const [approving, setApproving] = useState<CutScoreView | null>(null);

  const query = useListCutScores({ scaleVersionId }, { query: { enabled: ready && isUuid(scaleVersionId) }, request });
  const rows = query.data?.data ?? [];

  return (
    <FormCard
      title="Kesme puanı sürümleri"
      description={`Her sürüm ${REQUIRED_APPROVALS} farklı yetkilinin onayıyla onaylanır; yürürlük tarihi geçmişe alınamaz.`}
      aside={
        canManage ? (
          <Button size="sm" onClick={() => setProposing(true)}>
            Kesme sürümü öner
          </Button>
        ) : null
      }
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setScaleVersionId(scaleInput.trim());
        }}
      >
        <Field label="Ölçek sürümü kimliği (UUID)" hint="Sürümleri listelemek için ölçek sürümünü girin" error={scaleInput && !isUuid(scaleInput) ? "Geçerli bir UUID girin" : undefined}>
          <Input value={scaleInput} onChange={(event) => setScaleInput(event.target.value)} placeholder="00000000-0000-…" />
        </Field>
        <Button type="submit" variant="secondary" disabled={!isUuid(scaleInput)}>
          Listele
        </Button>
      </form>
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} compact /> : null}
      {isUuid(scaleVersionId) && query.isSuccess && rows.length === 0 ? <p className="text-sm text-fg-muted">Bu ölçek sürümü için kesme önerisi yok.</p> : null}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-neutral-50 text-left text-[11.5px] font-semibold text-fg-subtle">
                <th scope="col" className="px-3 py-2">Bant</th>
                <th scope="col" className="px-3 py-2">Sınır</th>
                <th scope="col" className="px-3 py-2 text-right">Kesme</th>
                <th scope="col" className="px-3 py-2 text-right">SEM</th>
                <th scope="col" className="px-3 py-2">Yürürlük</th>
                <th scope="col" className="px-3 py-2">Onay durumu</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">İşlemler</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((cut) => (
                <CutRow key={cut.id} cut={cut} canManage={canManage} onApprove={() => setApproving(cut)} />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <ProposeDialog
        key={proposing ? "open" : "closed"}
        open={proposing}
        onClose={() => setProposing(false)}
        studyId={studyId}
        initial={{ ...EMPTY_FORM, scaleVersionId: isUuid(scaleVersionId) ? scaleVersionId : "", cut: finalCut !== undefined ? String(finalCut) : "", sem: finalSem !== undefined ? String(finalSem) : "" }}
        onProposed={(id) => {
          setScaleInput(id);
          setScaleVersionId(id);
        }}
      />
      <ApproveDialog cut={approving} onClose={() => setApproving(null)} scaleVersionId={scaleVersionId} />
    </FormCard>
  );
}

function CutRow({ cut, canManage, onApprove }: { cut: CutScoreView; canManage: boolean; onApprove: () => void }) {
  const { user } = useAuth();
  const state = cutApprovalState(cut);
  return (
    <tr>
      <td className="px-3 py-2 font-medium text-fg">{cefrLabel(cut.band)}</td>
      <td className="px-3 py-2">{BOUNDARY_LABEL[cut.boundaryKind ?? ""] ?? cut.boundaryKind}</td>
      <td className="numeric px-3 py-2 text-right">{formatNumber(cut.cut, 3)}</td>
      <td className="numeric px-3 py-2 text-right">{cut.sem !== undefined ? formatNumber(cut.sem, 3) : "—"}</td>
      <td className="px-3 py-2 text-fg-muted">{formatWhen(cut.effectiveFrom)}</td>
      <td className="px-3 py-2">
        <Badge tone={state.tone} dot>
          {state.label}
        </Badge>
      </td>
      <td className="px-3 py-2 text-right">
        {canManage && canApproveCut(cut, user?.userId) ? (
          <Button size="sm" variant="secondary" onClick={onApprove}>
            Onayla
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

function ProposeDialog({
  open,
  onClose,
  studyId,
  initial,
  onProposed,
}: {
  open: boolean;
  onClose: () => void;
  studyId?: string;
  initial: CutFormState;
  onProposed: (scaleVersionId: string) => void;
}) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const propose = useProposeCutScore({ request });
  const [form, setForm] = useState<CutFormState>(initial);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = validateCutForm(form);
  const set = (patch: Partial<CutFormState>) => setForm((f) => ({ ...f, ...patch }));

  async function submit() {
    setTouched(true);
    if (Object.keys(errors).length > 0) return;
    setError(null);
    try {
      await propose.mutateAsync({ data: toProposeRequest(form, studyId) });
      await queryClient.invalidateQueries({ queryKey: getListCutScoresQueryKey({ scaleVersionId: form.scaleVersionId.trim() }) });
      notify.success("Kesme sürümü önerildi; onay bekliyor");
      onProposed(form.scaleVersionId.trim());
      setTouched(false);
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Kesme sürümü önerilemedi"));
    }
  }

  return (
    <FormDialog
      open={open}
      title="Kesme sürümü öner"
      description={studyId ? "Sonlandırılmış çalışmanın sonucu forma alındı; gerekirse düzeltin." : "Öneri iki farklı yetkili onaylayana dek yürürlüğe girmez."}
      submitLabel="Öner"
      pending={propose.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <Field label="Ölçek sürümü kimliği (UUID)" required error={touched ? errors.scaleVersionId : undefined}>
        <Input value={form.scaleVersionId} onChange={(e) => set({ scaleVersionId: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bant" required error={touched ? errors.band : undefined}>
          <Select value={form.band} onChange={(e) => set({ band: e.target.value })}>
            <option value="">Seçin</option>
            {CEFR_ORDER.map((level) => (
              <option key={level} value={level}>
                {cefrLabel(level)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sınır türü" required error={touched ? errors.boundaryKind : undefined}>
          <Select value={form.boundaryKind} onChange={(e) => set({ boundaryKind: e.target.value })}>
            <option value="">Seçin</option>
            {Object.entries(BOUNDARY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Kesme değeri" required error={touched ? errors.cut : undefined}>
          <Input inputMode="decimal" value={form.cut} onChange={(e) => set({ cut: e.target.value })} />
        </Field>
        <Field label="SEM" hint="İsteğe bağlı" error={touched ? errors.sem : undefined}>
          <Input inputMode="decimal" value={form.sem} onChange={(e) => set({ sem: e.target.value })} />
        </Field>
      </div>
      <Field label="Yürürlük tarihi" required error={touched ? errors.effectiveFrom : undefined}>
        <Input type="datetime-local" value={form.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
      </Field>
    </FormDialog>
  );
}

function ApproveDialog({ cut, onClose, scaleVersionId }: { cut: CutScoreView | null; onClose: () => void; scaleVersionId: string }) {
  const { request } = useCentralRequest();
  const queryClient = useQueryClient();
  const approve = useApproveCutScore({ request });
  const [error, setError] = useState<string | undefined>();
  const remaining = cut ? REQUIRED_APPROVALS - (cut.approvals?.length ?? 0) : 0;

  async function confirm() {
    if (!cut?.id) return;
    setError(undefined);
    try {
      await approve.mutateAsync({ cutScoreVersionId: cut.id, data: {} });
      await queryClient.invalidateQueries({ queryKey: getListCutScoresQueryKey({ scaleVersionId }) });
      notify.success("Onayınız kaydedildi");
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Onay kaydedilemedi"));
    }
  }

  return (
    <ConfirmDialog
      open={cut !== null}
      title="Kesme sürümünü onayla"
      description={`Bu sürüm için ${remaining} onay daha gerekiyor. ${REQUIRED_APPROVALS}. onaydan sonra sürüm, yürürlük tarihinde geçerli olur; aynı kişi iki kez onaylayamaz.`}
      confirmLabel="Onayla"
      tone="primary"
      pending={approve.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => void confirm()}
    />
  );
}
