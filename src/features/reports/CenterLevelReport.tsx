"use client";

import { useCenterReport } from "@/src/api/generated/report-controller/report-controller";
import { EmptyState, ErrorState, PageHeader, Skeleton, errorMessage } from "@/src/ui";

type AgreementRow = { itemId?: string; agreementRate?: number; sampleSize?: number } & Record<string, unknown>;
type OversightShare = Record<string, unknown>;

/** F5-03: merkez görünümü — AI-insan uyumu (F1-12) + gözetimli pay (F4-03'ün dışlama raporuyla aynı sayı). */
export function CenterLevelReport() {
  const reportQ = useCenterReport();

  if (reportQ.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (reportQ.isError) {
    return <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} message={errorMessage(reportQ.error, "Merkez raporu açılamadı")} />;
  }

  const body = reportQ.data?.data ?? {};
  const agreement = Array.isArray(body.aiHumanAgreement) ? (body.aiHumanAgreement as AgreementRow[]) : [];
  const oversight = (body.oversightShare ?? {}) as OversightShare;

  return (
    <div className="grid gap-4">
      <PageHeader title="Merkez raporu" description="AI-insan puanlama uyumu ve gözetimli yanıt payı." />

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium text-fg">AI-insan uyumu</h3>
        {agreement.length === 0 ? (
          <EmptyState tone="neutral" compact title="Veri yok" description="Henüz bir denetim örneklemi yok." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="py-1 pr-3">Madde</th>
                <th className="py-1 pr-3">Uyum oranı</th>
                <th className="py-1">Örneklem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agreement.map((row, i) => (
                <tr key={row.itemId ?? i}>
                  <td className="py-1.5 pr-3">{String(row.itemId ?? "—")}</td>
                  <td className="py-1.5 pr-3">{row.agreementRate != null ? `%${Math.round(row.agreementRate * 100)}` : "—"}</td>
                  <td className="py-1.5">{row.sampleSize ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium text-fg">Gözetimli pay</h3>
        {Object.keys(oversight).length === 0 ? (
          <EmptyState tone="neutral" compact title="Veri yok" description="Henüz hesaplanmamış." />
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {Object.entries(oversight).map(([key, value]) => (
              <div key={key}>
                <dt className="text-xs text-fg-subtle">{key}</dt>
                <dd className="font-medium text-fg">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
