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
    return <ErrorState compact error={query.error} title="Seviye raporu durumu alınamadı" onRetry={() => void query.refetch()} />;
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
      notify.error("Bağlantı kopyalanamadı");
    }
  }

  async function share() {
    if (!shareUrl) return;
    try {
      await navigator.share({ title: "ILC seviye raporu doğrulama", url: shareUrl });
    } catch {
      // kullanıcı paylaşımı kapattı: sessiz
    }
  }

  return (
    <section aria-label="Seviye raporu (PDF)" lang="tr" className="grid gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg">Seviye raporu (PDF)</h2>
        <Badge tone={view.kind === "ready" ? "success" : "warning"} dot>
          {view.kind === "ready" ? "Hazır" : "Hazırlanıyor"}
        </Badge>
      </div>
      {view.kind === "preparing" ? (
        <div className="grid gap-2">
          <p role="status" className="text-sm text-fg-muted">
            Seviye raporunuz hazırlanıyor. Bu birkaç dakika sürebilir; sayfa otomatik olarak yeniden sorgulanır.
          </p>
          <div>
            <Button variant="secondary" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
              Yeniden sorgula
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void download()} loading={downloading}>
              Seviye raporunu indir
            </Button>
          </div>
          {shareUrl ? (
            <div className="grid gap-1.5 rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-fg-subtle">Doğrulama bağlantısı (raporu herkes bu bağlantıyla doğrulayabilir)</p>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs break-all text-primary underline-offset-4 hover:underline">
                {shareUrl}
              </a>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => void copy()}>
                  {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
                </Button>
                {canNativeShare ? (
                  <Button variant="secondary" size="sm" onClick={() => void share()}>
                    Paylaş
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
      <p className="text-xs text-fg-muted">Seviye raporu bir sertifika değildir. Her indirmede aynı (saklanan) dosya verilir.</p>
    </section>
  );
}
