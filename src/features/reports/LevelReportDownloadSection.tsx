"use client";

import { useMyCertificate } from "@/src/api/generated/candidate-portal-controller/candidate-portal-controller";
import { useMyHistory } from "@/src/api/generated/report-controller/report-controller";
import { downloadMyLevelReport } from "@/src/features/reports/downloadLevelReport";
import {
  levelReportDownloadFailure,
  levelReportRefetchInterval,
  safeShareUrl,
  toLevelReportView,
} from "@/src/features/reports/levelReportModel";
import { Badge, Button, ErrorState, Skeleton, notify } from "@/src/ui";
import { useState } from "react";

/**
 * R-20: sonuç sayfasında SEVİYE RAPORU (PDF) indirme. Karne indirmesi (`StudentLevelReportSection`) ayrı ve değişmedi.
 * `applicationResultId`, diğer portal bölümleri gibi `useMyHistory` ile `applicationId`'den eşlenir.
 */
export function LevelReportDownloadSection({ applicationId }: { applicationId: string }) {
  const historyQ = useMyHistory();
  if (historyQ.isLoading) return <Skeleton className="h-24 rounded-xl" />;
  const resultId = historyQ.data?.data.find((r) => r.applicationId === applicationId)?.applicationResultId;
  if (!resultId) return null;
  return <LevelReportCard applicationResultId={resultId} />;
}

export function LevelReportCard({ applicationResultId }: { applicationResultId: string }) {
  const query = useMyCertificate(applicationResultId, {
    query: {
      refetchInterval: (q) => levelReportRefetchInterval(q.state.data?.data?.levelReportReady, q.state.dataUpdateCount),
    },
  });
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (query.isLoading) return <Skeleton className="h-24 rounded-xl" />;
  if (query.isError) {
    return <ErrorState compact error={query.error} title="We could not load the level report status" onRetry={() => void query.refetch()} />;
  }
  const raw = query.data?.data;
  const view = toLevelReportView(raw, applicationResultId);
  if (view.kind === "unknown") return null;

  const shareUrl = view.kind === "ready" ? safeShareUrl(view.verificationUrl) : null;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function download() {
    setDownloading(true);
    try {
      await downloadMyLevelReport(applicationResultId, raw?.levelReportUrl);
    } catch (err) {
      notify.error(levelReportDownloadFailure(err));
    } finally {
      setDownloading(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      notify.error("Could not copy the link");
    }
  }

  async function share() {
    if (!shareUrl) return;
    try {
      await navigator.share({ title: "ILC level report verification", url: shareUrl });
    } catch {
      // kullanıcı paylaşımı kapattı: sessiz
    }
  }

  return (
    <section aria-label="Level report (PDF)" lang="en" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Level report (PDF)</h2>
        <Badge tone={view.kind === "ready" ? "success" : "warning"} dot>
          {view.kind === "ready" ? "Ready" : "Preparing"}
        </Badge>
      </div>
      {view.kind === "preparing" ? (
        <div className="grid gap-2">
          <p role="status" className="text-sm text-fg-muted">
            Your level report is being prepared. This may take a few minutes; the page checks again automatically.
          </p>
          <div>
            <Button variant="secondary" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
              Check again
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void download()} loading={downloading}>
              Download level report
            </Button>
          </div>
          {shareUrl ? (
            <div className="grid gap-1.5 rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-fg-subtle">Verification link (anyone can verify the report with this link)</p>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs break-all text-primary underline-offset-4 hover:underline">
                {shareUrl}
              </a>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void copy()}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                {canNativeShare ? (
                  <Button variant="secondary" size="sm" onClick={() => void share()}>
                    Share
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
      <p className="text-xs text-fg-muted">A level report is not a certificate. Every download returns the same stored file.</p>
    </section>
  );
}
