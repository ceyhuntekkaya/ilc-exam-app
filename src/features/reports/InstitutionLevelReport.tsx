"use client";

import { useInstitutionReport } from "@/src/api/generated/report-controller/report-controller";
import { EmptyState, ErrorState, PageHeader, Skeleton, errorMessage } from "@/src/ui";
import { Badge } from "@/src/ui/primitives/Badge";
import type { ReportModel } from "@/src/api/generated/models";

/**
 * F5-03: kurum görünümü — kohort (CEFR bant) dağılımı + güvence seviyesi kırılımı.
 * **Açık madde**: plan metninde "iş bağlamı bloğu" geçiyor ama {@code ReportModel}'de bu alan
 * YOK (backend henüz üretmiyor) — uydurulmadı, atlandı; bkz. plan/DURUM.md.
 */
export function InstitutionLevelReport({ companyId }: { companyId: string }) {
  const reportQ = useInstitutionReport(companyId, { query: { enabled: Boolean(companyId) } });

  if (reportQ.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (reportQ.isError) {
    return <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} message={errorMessage(reportQ.error, "Rapor açılamadı")} />;
  }
  const reports = reportQ.data?.data ?? [];
  if (reports.length === 0) {
    return <EmptyState tone="neutral" title="Sonuç yok" description="Bu kurumda yayınlanmış bir sonuç bulunamadı." />;
  }

  const byBand = countBy(reports, (r) => r.cefrLevel ?? "—");
  const byAssurance = countBy(reports, (r) => r.assuranceLevel ?? "—");

  return (
    <div className="grid gap-4">
      <PageHeader title="Kurum raporu" description="Kohort dağılımı ve güvence seviyesi kırılımı." />
      <Distribution title="CEFR bant dağılımı" counts={byBand} total={reports.length} />
      <Distribution title="Güvence seviyesi kırılımı" counts={byAssurance} total={reports.length} />
    </div>
  );
}

function countBy(reports: ReportModel[], key: (r: ReportModel) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of reports) {
    const k = key(r);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

function Distribution({ title, counts, total }: { title: string; counts: Map<string, number>; total: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-2 text-sm font-medium text-fg">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {[...counts.entries()].map(([label, count]) => (
          <Badge key={label} tone="neutral">{`${label}: ${count} (%${Math.round((count / total) * 100)})`}</Badge>
        ))}
      </div>
    </div>
  );
}
