"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCandidatesQueryKey,
  getDetailQueryKey,
  getList4QueryKey,
  useOpen,
  usePreview,
} from "@/src/api/generated/company-distributions/company-distributions";
import type { OpenRow } from "@/src/api/generated/models";
import { Button, ButtonLink, ConfirmDialog, ErrorState, Skeleton, errorMessage, notify } from "@/src/ui";
import { omitReasonLabel, omittedRows, openOutcome, quotaState } from "@/src/features/distribution/distributionModel";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <p className="text-xs text-fg-subtle">{label}</p>
      <p className="numeric text-lg font-semibold text-fg">{value.toLocaleString("tr-TR")}</p>
    </div>
  );
}

/**
 * Önizleme (yalnız sayılar — kimlik listesi dönmez) + kota uyarısı + açma onayı. Açma geri alınamaz ve
 * hedeflenen her aday için hak rezerve eder; kimse elenmez, hakkı yetmeyenler açılışta atlanır.
 */
export function PreviewOpenStep({
  distributionId,
  canOpen,
  onBack,
}: {
  distributionId: string;
  canOpen: boolean;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const previewQ = usePreview(distributionId, { query: { staleTime: 0, gcTime: 0, refetchOnMount: "always" } });
  const open = useOpen();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<OpenRow | null>(null);

  const preview = previewQ.data?.data;
  const quota = quotaState(preview);
  const omitted = omittedRows(preview);
  const recipientCount = preview?.recipientCount ?? 0;

  async function submit() {
    if (open.isPending) return;
    setError(undefined);
    try {
      const res = await open.mutateAsync({ distributionId });
      setResult(res.data);
      setConfirm(false);
      notify.success("Dağıtım açıldı");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getList4QueryKey() }),
        queryClient.invalidateQueries({ queryKey: getDetailQueryKey(distributionId) }),
        queryClient.invalidateQueries({ queryKey: getCandidatesQueryKey(distributionId) }),
      ]);
    } catch (err) {
      // 400/409 backend `error` metni (ör. paket süresi dolmuş, kip eksik) kullanıcıya olduğu gibi gösterilir.
      setError(errorMessage(err, "Dağıtım açılamadı"));
    }
  }

  if (result) {
    const outcome = openOutcome(result);
    return (
      <div className="grid gap-4">
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            outcome.tone === "warning" ? "border-warning/30 bg-warning-bg text-fg" : "border-success/25 bg-success-bg text-success"
          }`}
        >
          <p className="font-semibold">Dağıtım açıldı</p>
          <ul className="mt-1 list-disc pl-5">
            {outcome.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Hak ayrılan" value={result.allocatedCount ?? 0} />
          <Stat label="Hak yetmeyen (atlanan)" value={result.skippedForQuotaCount ?? 0} />
          <Stat label="Çakışan" value={result.conflictCount ?? 0} />
        </div>
        <div>
          <ButtonLink href={`/staff/distributions/${distributionId}`}>Adayları izle</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {previewQ.isLoading ? (
        <Skeleton className="h-28 rounded-lg" />
      ) : previewQ.isError ? (
        <ErrorState error={previewQ.error} onRetry={() => void previewQ.refetch()} title="Önizleme alınamadı" compact />
      ) : preview ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Hedeflenen kişi" value={recipientCount} />
            <Stat label="Yinelenen (tek sayıldı)" value={preview.duplicateCount ?? 0} />
            <Stat label="Elenen" value={omitted.reduce((sum, row) => sum + row.count, 0)} />
          </div>

          {quota.warn ? (
            <div role="alert" className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger">
              <p className="font-semibold">{quota.message}</p>
              <p className="mt-1 text-fg">
                Kimse hedeften çıkarılmaz. Açılışta hakkı yetmeyen {quota.skipped} kişi atlanır ve sonuçta ayrıca
                gösterilir; atlananlar için paketin hakkını artırıp yeni dağıtım açabilirsiniz.
              </p>
            </div>
          ) : null}

          {omitted.length > 0 ? (
            <div className="grid gap-1">
              <h3 className="text-sm font-semibold text-fg">Eleme nedenleri</h3>
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {omitted.map((row) => (
                  <li key={row.reason} className="flex justify-between px-3 py-2">
                    <span className="text-fg-muted">{omitReasonLabel(row.reason)}</span>
                    <span className="numeric font-medium text-fg">{row.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Geri
        </Button>
        {canOpen ? (
          <Button type="button" disabled={!preview || recipientCount === 0} onClick={() => {
              setError(undefined);
              setConfirm(true);
            }}>
            Dağıtımı aç
          </Button>
        ) : null}
      </div>
      {preview && recipientCount === 0 ? (
        <p className="text-sm text-fg-muted">Hedeflenen kişi yok; kuralları gözden geçirin.</p>
      ) : null}

      <ConfirmDialog
        open={confirm}
        tone="primary"
        title="Dağıtım açılsın mı?"
        description={
          <>
            Bu işlem <strong>geri alınamaz</strong>. Açıldığında hedeflenen {recipientCount} kişi için paketten hak
            rezerve edilir ve adaylar sınava başlayabilir.
            {quota.warn ? ` Hak yetmediği için ${quota.skipped} kişi atlanacak.` : ""}
          </>
        }
        confirmLabel="Evet, aç"
        pending={open.isPending}
        error={error}
        onClose={() => setConfirm(false)}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
