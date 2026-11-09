"use client";

import { useState } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  getGetStudyQueryKey,
  getListStudiesQueryKey,
  useAddPanelist,
  useCloseRound,
  useFinalizeStudy,
  useGetStudy,
  useListCredentials,
  useOpenRound,
  useRemovePanelist,
} from "@/src/api/generated/standart-belirleme/standart-belirleme";
import type { PanelistView, StudyView } from "@/src/api/generated/models";
import { useCan, usePanel } from "@/src/features/panel/PanelContext";
import { formatWhen, useCentralRequest } from "@/src/features/psychometrics/central";
import { PsychometricsTabs } from "@/src/features/psychometrics/PsychometricsTabs";
import { CutScorePanel } from "@/src/features/standard-setting/CutScorePanel";
import { RoundStats } from "@/src/features/standard-setting/RoundStats";
import { StandardSettingSubNav } from "@/src/features/standard-setting/SubNav";
import {
  STUDY_STATUS_TONE,
  cutUnitLabel,
  eligiblePanelists,
  formatNumber,
  latestRoundNo,
  MIN_PANELISTS,
  methodLabel,
  openRoundFailure,
  openRoundOf,
  panelistCredentialLabel,
  studyActions,
  studyStatusLabel,
} from "@/src/features/standard-setting/model";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, DefinitionList, ErrorState, Field, FormCard, FormDialog, PageHeader, Select, Spinner, errorMessage, notify } from "@/src/ui";

/** R-15 (E-37): çalışma detayı — panel yönetimi, tur aç/kapat, tur istatistiği, sonlandırma ve kesme sürümü. */
export function StudyDetailPage({ studyId }: { studyId: string }) {
  const { ready, request } = useCentralRequest();
  const { basePath } = usePanel();
  const query = useGetStudy(studyId, { query: { enabled: ready }, request });
  const study = query.data?.data;

  if (query.isLoading || !ready) return <Spinner />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!study) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: `${basePath}/content/standard-setting`, label: "Çalışmalar" }}
        title={`${study.examCode ?? "Sınav"} — ${methodLabel(study.method)}`}
        description={study.examTitle}
      />
      <PsychometricsTabs />
      <StandardSettingSubNav />
      <StudySummary study={study} />
      <PanelistsCard study={study} />
      <RoundsCard study={study} />
      {study.status === "FINALIZED" ? <CutScorePanel studyId={study.id} finalCut={study.finalCut} finalSem={study.finalSem} /> : null}
    </div>
  );
}

/** Çalışmayı, tur istatistiklerini (aynı yol önekini paylaşırlar) ve listeyi tazeler. */
async function refreshStudy(queryClient: QueryClient, studyId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: getGetStudyQueryKey(studyId) }),
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && q.queryKey[0].startsWith(`/standard-setting/studies/${studyId}/`) }),
    queryClient.invalidateQueries({ queryKey: getListStudiesQueryKey() }),
  ]);
}

function StudySummary({ study }: { study: StudyView }) {
  const unit = cutUnitLabel(study.method);
  return (
    <FormCard
      title="Özet"
      aside={
        <Badge tone={STUDY_STATUS_TONE[study.status ?? ""] ?? "neutral"} dot>
          {studyStatusLabel(study.status)}
        </Badge>
      }
    >
      <DefinitionList
        items={[
          { term: "Yöntem", description: methodLabel(study.method) },
          { term: "Sınav sürümü", description: `v${study.examVersionNo ?? "—"}` },
          { term: "Madde sayısı", description: String(study.itemCount ?? 0) },
          { term: "Oluşturulma", description: formatWhen(study.createdAt) },
          { term: "Sonlandırma", description: study.finalizedAt ? formatWhen(study.finalizedAt) : "Henüz sonlandırılmadı" },
          {
            term: `Nihai kesme (${unit}) / SEM`,
            description: study.finalCut !== undefined ? `${formatNumber(study.finalCut, 3)} / ${formatNumber(study.finalSem, 3)}` : "—",
          },
        ]}
      />
    </FormCard>
  );
}

function PanelistsCard({ study }: { study: StudyView }) {
  const { request } = useCentralRequest();
  const canManage = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const remove = useRemovePanelist({ request });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<PanelistView | null>(null);
  const [error, setError] = useState<string | undefined>();
  const actions = studyActions(study);
  const panelists = study.panelists ?? [];

  const refresh = () => refreshStudy(queryClient, study.id!);

  async function confirmRemove() {
    if (!removing?.panelistId) return;
    setError(undefined);
    try {
      await remove.mutateAsync({ studyId: study.id!, staffUserId: removing.panelistId });
      await refresh();
      notify.success("Panelist panelden çıkarıldı");
      setRemoving(null);
    } catch (e) {
      setError(errorMessage(e, "Panelist çıkarılamadı"));
    }
  }

  return (
    <FormCard
      title={`Panel (${panelists.length})`}
      description="Panele yalnız onaylı ve süresi dolmamış panelist kimliği olan merkez personeli eklenebilir; panel yalnız açık tur yokken değiştirilir."
      aside={
        canManage && actions.addPanelist ? (
          <Button size="sm" onClick={() => setAdding(true)}>
            Panelist ekle
          </Button>
        ) : null
      }
    >
      {panelists.length === 0 ? (
        <p className="text-sm text-fg-muted">Panelde henüz kimse yok. Tur açmak için en az {MIN_PANELISTS} panelist gerekir.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {panelists.map((p) => {
            const cred = panelistCredentialLabel(p);
            return (
              <li key={p.panelistId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium text-fg">{p.displayName ?? p.panelistId}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone={cred.tone} dot>
                    {cred.label}
                  </Badge>
                  {p.credentialValidUntil ? <span className="text-xs text-fg-subtle">Geçerlilik: {formatWhen(p.credentialValidUntil)}</span> : null}
                  {canManage && actions.removePanelist ? (
                    <Button size="sm" variant="ghost" onClick={() => { setError(undefined); setRemoving(p); }}>
                      Çıkar
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <AddPanelistDialog key={adding ? "open" : "closed"} open={adding} study={study} onClose={() => setAdding(false)} onDone={refresh} />
      <ConfirmDialog
        open={removing !== null}
        title="Panelisti çıkar"
        description={`${removing?.displayName ?? "Panelist"} panelden çıkarılır. Puanı olan panelist çıkarılamaz (puan geçmişi korunur); bu durumda sistem uyarı verir.`}
        confirmLabel="Çıkar"
        pending={remove.isPending}
        error={error}
        onClose={() => setRemoving(null)}
        onConfirm={() => void confirmRemove()}
      />
    </FormCard>
  );
}

function AddPanelistDialog({ open, study, onClose, onDone }: { open: boolean; study: StudyView; onClose: () => void; onDone: () => Promise<void> }) {
  const { ready, request } = useCentralRequest();
  const credentials = useListCredentials({ query: { enabled: ready && open }, request });
  const add = useAddPanelist({ request });
  const [staffId, setStaffId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const eligible = eligiblePanelists(credentials.data?.data ?? [], (study.panelists ?? []).map((p) => p.panelistId ?? ""));

  async function submit() {
    if (!staffId) return setError("Panelist seçin");
    setError(null);
    try {
      await add.mutateAsync({ studyId: study.id!, staffUserId: staffId });
      await onDone();
      notify.success("Panelist eklendi");
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Panelist eklenemedi"));
    }
  }

  return (
    <FormDialog open={open} title="Panelist ekle" submitLabel="Ekle" pending={add.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {credentials.isLoading ? <Spinner /> : null}
      {credentials.isError ? <p className="text-sm text-danger">{errorMessage(credentials.error, "Kimlikler alınamadı")}</p> : null}
      {credentials.isSuccess && eligible.length === 0 ? (
        <p className="text-sm text-fg-muted">Eklenebilir panelist yok. Önce “Panelist kimlikleri” ekranından bir kimlik talep edip onaylayın.</p>
      ) : (
        <Field label="Panelist" required>
          <Select value={staffId} onChange={(event) => setStaffId(event.target.value)}>
            <option value="">Seçin</option>
            {eligible.map((c) => (
              <option key={c.staffId} value={c.staffId}>
                {c.displayName ?? c.staffId}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FormDialog>
  );
}

function RoundsCard({ study }: { study: StudyView }) {
  const { request } = useCentralRequest();
  const canManage = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const openRound = useOpenRound({ request });
  const closeRound = useCloseRound({ request });
  const finalize = useFinalizeStudy({ request });
  const [selected, setSelected] = useState<number | null>(null);
  const [dialog, setDialog] = useState<"close" | "finalize" | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [openError, setOpenError] = useState<string | null>(null);
  const actions = studyActions(study);
  const rounds = [...(study.rounds ?? [])].sort((a, b) => (a.roundNo ?? 0) - (b.roundNo ?? 0));
  const shown = selected ?? latestRoundNo(study) ?? null;
  const open = openRoundOf(study);

  const refresh = () => refreshStudy(queryClient, study.id!);

  async function doOpen() {
    setOpenError(null);
    try {
      const result = await openRound.mutateAsync({ studyId: study.id! });
      await refresh();
      setSelected(latestRoundNo(result.data) ?? null);
      notify.success("Yeni tur açıldı");
    } catch (e) {
      // 409: Bookmark için CALIBRATED olmayan maddelerin madde bazlı nedenleri (uzun olabilir) — kalıcı uyarıda, olduğu gibi.
      setOpenError(openRoundFailure(e, study.method));
    }
  }

  async function confirm() {
    setError(undefined);
    try {
      if (dialog === "close" && open?.roundNo !== undefined) await closeRound.mutateAsync({ studyId: study.id!, roundNo: open.roundNo });
      if (dialog === "finalize") await finalize.mutateAsync({ studyId: study.id! });
      await refresh();
      notify.success(dialog === "finalize" ? "Çalışma sonlandırıldı" : "Tur kapatıldı");
      setDialog(null);
    } catch (e) {
      setError(errorMessage(e, "İşlem tamamlanamadı"));
    }
  }

  return (
    <FormCard
      title={`Turlar (${rounds.length})`}
      description="Panelistler yalnız açık turda puan girer. Tur kapanınca istatistik kesinleşir; yeni tur açılabilir ya da çalışma sonlandırılır."
      aside={
        canManage ? (
          <div className="flex flex-wrap gap-2">
            {actions.openRound ? (
              <Button size="sm" onClick={() => void doOpen()} loading={openRound.isPending}>
                Yeni tur aç
              </Button>
            ) : null}
            {actions.closeRound ? (
              <Button size="sm" variant="secondary" onClick={() => { setError(undefined); setDialog("close"); }}>
                Turu kapat
              </Button>
            ) : null}
            {actions.finalize ? (
              <Button size="sm" variant="danger" onClick={() => { setError(undefined); setDialog("finalize"); }}>
                Çalışmayı sonlandır
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      {openError ? (
        <div role="alert" className="whitespace-pre-line rounded-lg border border-danger/25 bg-danger-bg p-3 text-sm text-danger">
          <p className="font-semibold">Tur açılamadı</p>
          <p className="mt-1">{openError}</p>
        </div>
      ) : null}
      {study.method === "BOOKMARK" && study.status === "OPEN" ? (
        <p className="text-[13px] text-fg-muted">Bookmark turu, çalışmadaki tüm maddeler kalibre (CALIBRATED) olana kadar açılamaz; eksik maddeler tur açılırken listelenir.</p>
      ) : null}
      {study.status === "OPEN" && !openRoundOf(study) && (study.panelists?.length ?? 0) < MIN_PANELISTS ? (
        <p className="text-[13px] text-fg-muted">Tur açmak için panelde en az {MIN_PANELISTS} panelist olmalı (şu an {study.panelists?.length ?? 0}).</p>
      ) : null}
      {rounds.length === 0 ? (
        <p className="text-sm text-fg-muted">Henüz tur açılmadı.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Turlar" className="flex flex-wrap gap-1">
            {rounds.map((round) => (
              <button
                key={round.roundNo}
                role="tab"
                type="button"
                aria-selected={shown === round.roundNo}
                onClick={() => setSelected(round.roundNo ?? null)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${shown === round.roundNo ? "bg-primary-50 text-primary ring-1 ring-primary/20" : "text-fg-muted hover:bg-neutral-50"}`}
              >
                Tur {round.roundNo}
                {round.open ? " · açık" : ""}
              </button>
            ))}
          </div>
          {shown !== null ? (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-[13px] text-fg-muted">
                {(() => {
                  const r = rounds.find((x) => x.roundNo === shown);
                  return r ? `Açılış: ${formatWhen(r.openedAt)}${r.closedAt ? ` · Kapanış: ${formatWhen(r.closedAt)}` : ""}` : "";
                })()}
              </p>
              <RoundStats key={`${study.id}-${shown}`} studyId={study.id!} roundNo={shown} />
            </div>
          ) : null}
        </>
      )}
      <ConfirmDialog
        open={dialog === "close"}
        title={`Tur ${open?.roundNo ?? ""} kapatılsın mı?`}
        description="Kapanan turda panelistler puan giremez; tamamlamayan panelistlerin puanları istatistiğe dahil edilmez."
        confirmLabel="Turu kapat"
        tone="primary"
        pending={closeRound.isPending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={() => void confirm()}
      />
      <ConfirmDialog
        open={dialog === "finalize"}
        title="Çalışma sonlandırılsın mı?"
        description={`Sonlandırma GERİ ALINAMAZ. Son kapalı turun tamamlayan panelistlerinin (en az ${MIN_PANELISTS}) ortalaması nihai kesme, standart hatası SEM olarak kaydedilir (elle girilmez); çalışmaya artık tur açılamaz ve panel değiştirilemez. Kesme puanı sürümü ayrıca önerilip iki onayla yürürlüğe alınır.`}
        confirmLabel="Sonlandır"
        confirmPhrase="SONLANDIR"
        pending={finalize.isPending}
        error={error}
        onClose={() => setDialog(null)}
        onConfirm={() => void confirm()}
      />
    </FormCard>
  );
}
