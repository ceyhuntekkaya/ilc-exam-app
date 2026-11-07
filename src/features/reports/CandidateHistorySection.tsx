"use client";

import { useMyHistory } from "@/src/api/generated/report-controller/report-controller";
import { EmptyState, ErrorState, PageHeader, Skeleton, errorMessage } from "@/src/ui";
import { Badge } from "@/src/ui/primitives/Badge";

/** F5-03: adayın kendi geçmişi — yıllar arası gelişim, bantlar arası ilerleme (basit tablo). */
export function CandidateHistorySection() {
  const historyQ = useMyHistory();

  if (historyQ.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (historyQ.isError) {
    return <ErrorState error={historyQ.error} onRetry={() => void historyQ.refetch()} message={errorMessage(historyQ.error, "Geçmiş açılamadı")} />;
  }
  const reports = [...(historyQ.data?.data ?? [])].sort((a, b) =>
    (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""),
  );
  if (reports.length === 0) {
    return <EmptyState tone="neutral" title="Henüz bir sonuç yok" description="Yayınlanmış bir sonuç bulununca burada görünecek." />;
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="Geçmişim" description="Yıllar arası gelişim — en eski sonuçtan en yeniye." />
      <ol className="grid gap-2">
        {reports.map((report, i) => {
          const prev = i > 0 ? reports[i - 1] : null;
          const improved = prev && prev.cefrLevel && report.cefrLevel && report.cefrLevel !== prev.cefrLevel;
          return (
            <li key={report.applicationResultId} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
              <div>
                <p className="text-sm font-medium text-fg">{String(report.membership?.companyName ?? "—")}</p>
                <p className="text-xs text-fg-muted">{report.publishedAt ? new Date(report.publishedAt).toLocaleDateString("tr-TR") : "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                {improved ? <Badge tone="success">İlerleme</Badge> : null}
                <Badge tone="brand">{report.cefrLevel ?? "—"}</Badge>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
