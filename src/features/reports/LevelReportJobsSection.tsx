"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getList17QueryKey,
  useList17 as useLevelReportJobs,
  useRequeue,
  useRequeueAllDead,
} from "@/src/api/generated/level-report-admin-controller/level-report-admin-controller";
import type { JobView } from "@/src/api/generated/models";
import { formatDateTime } from "@/src/features/individual/commerceModel";
import { useCan } from "@/src/features/panel/PanelContext";
import {
  JOB_LIMIT_DEFAULT,
  JOB_STATUS_FILTERS,
  canRequeue,
  canRequeueAll,
  jobKindLabel,
  jobStatusView,
  requeueFailureMessage,
  type JobStatusFilter,
} from "@/src/features/reports/levelReportModel";
import { Perm } from "@/src/lib/permissions";
import { Badge, Button, ConfirmDialog, ErrorState, FilterTabs, SectionTable, SectionToolbar, notify } from "@/src/ui";

function shortId(id?: string) {
  return id ? id.slice(0, 8) : "—";
}

/**
 * R-20 inceleme B5: seviye raporu üretim kuyruğu (merkez). Varsayılan görünüm ölü mektuplardır (10 deneme sonrası DEAD).
 * Yeniden kuyruğa alma bir rapor ÜRETMEZ/GÖSTERMEZ; işi yeniden denemeye sokar. Yazma düğmeleri `psychometrics:manage` olmayana
 * gösterilmez (sunucu merkez + izin denetler). DEAD otomatik yeniden denenmez: burası elle yönetimdir.
 */
export function LevelReportJobsSection() {
  const canManage = useCan(Perm.psychometricsManage);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<JobStatusFilter>("DEAD");
  const params = { status: filter, limit: JOB_LIMIT_DEFAULT };
  const query = useLevelReportJobs(params);
  const requeue = useRequeue();
  const requeueAll = useRequeueAllDead();
  const [confirmAll, setConfirmAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const jobs: JobView[] = query.data?.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: getList17QueryKey(params) });
  }

  async function runRequeue(job: JobView) {
    if (!job.jobId) return;
    setBusyId(job.jobId);
    try {
      await requeue.mutateAsync({ jobId: job.jobId });
      notify.success("İş yeniden kuyruğa alındı");
      await refresh();
    } catch (err) {
      notify.error(requeueFailureMessage(err));
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function runRequeueAll() {
    setError(undefined);
    try {
      const result = await requeueAll.mutateAsync();
      const count = result.data?.requeued ?? 0;
      notify.success(`${count} ölü mektup iş yeniden kuyruğa alındı`);
      setConfirmAll(false);
      await refresh();
    } catch (err) {
      setError(requeueFailureMessage(err));
    }
  }

  return (
    <div className="grid gap-4">
      <div role="note" className="rounded-lg border border-border bg-neutral-50/60 px-3 py-2.5 text-[13px] text-fg-muted">
        Seviye raporu sonuç yayınlanınca arka planda üretilir. Üretilemeyen işler 10 denemeden sonra “ölü mektup” olur ve
        otomatik yeniden denenmez; neden bulunup giderildikten sonra buradan yeniden kuyruğa alınır. En çok 200 kayıt listelenir.
      </div>
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionTable
          loading={query.isLoading}
          tabs={
            <FilterTabs
              label="İş durumu"
              items={JOB_STATUS_FILTERS.map((f) => ({ label: f.label, value: f.value }))}
              value={filter}
              onChange={(v) => setFilter((v as JobStatusFilter | null) ?? "DEAD")}
            />
          }
          toolbar={
            <SectionToolbar count={jobs.length} noun="iş" loading={query.isLoading}>
              {canManage && canRequeueAll(filter, jobs) ? (
                <Button size="sm" variant="secondary" onClick={() => setConfirmAll(true)}>
                  Tüm ölü mektupları yeniden kuyruğa al
                </Button>
              ) : null}
            </SectionToolbar>
          }
          columns={["İş", "Sonuç", "Durum", "Tür", "Deneme", "Son hata", "Zaman", ""]}
          empty={filter === "DEAD" ? "Ölü mektup iş yok" : "Bu durumda iş yok"}
          emptyHint={filter === "DEAD" ? "Üretimi başarısız kalan seviye raporu işi bulunmuyor." : "Seçili durumda kayıtlı iş bulunmuyor."}
          emptyTone="neutral"
          rows={jobs.map((job) => {
            const status = jobStatusView(job.status);
            return [
              <span key="j" className="font-mono text-xs" title={job.jobId}>
                {shortId(job.jobId)}
              </span>,
              <span key="r" className="font-mono text-xs" title={job.applicationResultId}>
                {shortId(job.applicationResultId)}
              </span>,
              <Badge key="s" tone={status.tone} dot>
                {status.label}
              </Badge>,
              jobKindLabel(job.kind),
              <span key="a" className="numeric">
                {job.attemptCount ?? 0}
              </span>,
              <span key="e" className="font-mono text-xs">
                {job.lastErrorCode ?? "—"}
              </span>,
              <span key="t" className="text-xs text-fg-muted">
                {job.status === "DEAD"
                  ? `Öldü: ${formatDateTime(job.deadAt)}`
                  : job.status === "PENDING"
                    ? `Sonraki deneme: ${formatDateTime(job.nextAttemptAt)}`
                    : `Oluştu: ${formatDateTime(job.createdAt)}`}
              </span>,
              <div key="x" className="flex justify-end">
                {canManage && canRequeue(job) ? (
                  <Button size="sm" variant="secondary" loading={busyId === job.jobId} onClick={() => void runRequeue(job)}>
                    Yeniden kuyruğa al
                  </Button>
                ) : null}
              </div>,
            ];
          })}
        />
      )}
      <ConfirmDialog
        open={confirmAll}
        tone="primary"
        title="Tüm ölü mektuplar yeniden kuyruğa alınsın mı?"
        description="Ölü mektup durumundaki işler (en çok 500) yeniden denenmek üzere kuyruğa alınır. Hata nedeni giderilmediyse işler yeniden ölü mektup olur."
        confirmLabel="Yeniden kuyruğa al"
        pending={requeueAll.isPending}
        error={error}
        onClose={() => setConfirmAll(false)}
        onConfirm={() => void runRequeueAll()}
      />
    </div>
  );
}
