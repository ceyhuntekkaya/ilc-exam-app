"use client";

import { useMemo } from "react";
import { useList20 as useOrgUnits } from "@/src/api/generated/org-units/org-units";
import { useInstitutionReport } from "@/src/api/generated/report-controller/report-controller";
import { EmptyState, ErrorState, PageHeader, Skeleton, errorMessage } from "@/src/ui";
import { Badge } from "@/src/ui/primitives/Badge";
import {
  ASSURANCE_LABEL, CEFR_ORDER, INTEGRITY_LABEL, byMonth, byUnit, cefrDisplay, distribution, summarize,
  type DistributionRow,
} from "./institutionReportModel";

/**
 * F5-03: kurum görünümü — özet, CEFR kohortu, birim karşılaştırması, dönemsel gelişim, gözetim ve
 * güvence kırılımı. Hepsi kapsama göre süzülmüş {@code ReportModel} listesinden türetilir.
 * **Açık madde**: "iş bağlamı bloğu" backend'de henüz yok (bkz. plan/DURUM.md) — uydurulmadı.
 */
export function InstitutionLevelReport({ companyId }: { companyId: string }) {
  const reportQ = useInstitutionReport(companyId, { query: { enabled: Boolean(companyId) } });
  // Birim adı yalnız süs: izin yoksa/başarısızsa kısa kimlikle devam edilir.
  const unitsQ = useOrgUnits(companyId, { query: { enabled: Boolean(companyId), retry: false } });
  const unitName = useMemo(
    () => new Map((unitsQ.data?.data?.items ?? []).filter((u) => u.id).map((u) => [u.id!, u.name ?? u.code ?? u.id!])),
    [unitsQ.data],
  );

  if (reportQ.isLoading) return <Skeleton className="h-48 rounded-xl" />;
  if (reportQ.isError) {
    return <ErrorState error={reportQ.error} onRetry={() => void reportQ.refetch()} message={errorMessage(reportQ.error, "Rapor açılamadı")} />;
  }
  const reports = reportQ.data?.data ?? [];
  if (reports.length === 0) {
    return <EmptyState tone="neutral" title="Sonuç yok" description="Bu kurumda henüz değerlendirilmiş bir sonuç yok." />;
  }

  const summary = summarize(reports);
  const bands = distribution(reports, (r) => r.cefrLevel ?? "—", CEFR_ORDER);
  const integrity = distribution(reports, (r) => r.integrityLevel ?? "—");
  const assurance = distribution(reports, (r) => r.assuranceLevel ?? "—");
  const units = byUnit(reports);
  const months = byMonth(reports);
  const small = reports.length < 5;

  return (
    <div className="grid gap-4">
      <PageHeader title="Kurum raporu" description="Kohort dağılımı, birim karşılaştırması ve güvence seviyesi kırılımı." />

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Yayınlanmış sonuç" value={String(summary.total)} />
        <Stat label="Geçme oranı" value={summary.passRate == null ? "—" : `%${summary.passRate}`} />
        <Stat label="Ortalama başarı" value={summary.avgPercent == null ? "—" : `%${summary.avgPercent}`} />
      </div>
      {small ? <p className="text-xs text-fg-muted">Kohort küçük ({reports.length} sonuç): yüzdeler yorumlanırken dikkatli olun.</p> : null}

      <Card title="CEFR bant dağılımı">
        <Bars rows={bands} label={(k) => (k === "—" ? "Belirsiz" : cefrDisplay(k))} />
      </Card>

      <Card title="Birim karşılaştırması">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-subtle">
              <th className="py-1 pr-3">Birim</th>
              <th className="py-1 pr-3">Sonuç</th>
              <th className="py-1 pr-3">Ort. başarı</th>
              <th className="py-1">Baskın bant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {units.map((u) => (
              <tr key={u.unitId ?? "none"}>
                <td className="py-1.5 pr-3">{u.unitId ? (unitName.get(u.unitId) ?? `Birim ${u.unitId.slice(0, 8)}`) : "Birimsiz"}</td>
                <td className="py-1.5 pr-3">{u.count}</td>
                <td className="py-1.5 pr-3">{u.avgPercent == null ? "—" : `%${u.avgPercent}`}</td>
                <td className="py-1.5">{u.topBand ? cefrDisplay(u.topBand) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Dönemsel gelişim (yayın ayına göre)">
        {months.length === 0 ? (
          <p className="text-sm text-fg-muted">Yayın tarihi olan sonuç yok.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-fg-subtle">
                <th className="py-1 pr-3">Ay</th>
                <th className="py-1 pr-3">Sonuç</th>
                <th className="py-1">Bant dağılımı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((m) => (
                <tr key={m.period}>
                  <td className="py-1.5 pr-3">{m.period}</td>
                  <td className="py-1.5 pr-3">{m.count}</td>
                  <td className="py-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {m.bands.map((b) => <Badge key={b.key} tone="neutral">{`${b.key === "—" ? "Belirsiz" : cefrDisplay(b.key)}: ${b.count}`}</Badge>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Gözetim düzeyi (bütünlük)">
          <Bars rows={integrity} label={(k) => INTEGRITY_LABEL[k] ?? k} />
        </Card>
        <Card title="Güvence seviyesi kırılımı">
          <Bars rows={assurance} label={(k) => ASSURANCE_LABEL[k] ?? k} />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-xs text-fg-subtle">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-fg">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-fg">{title}</h3>
      {children}
    </div>
  );
}

function Bars({ rows, label }: { rows: DistributionRow[]; label: (key: string) => string }) {
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-3 text-sm">
          <span className="truncate text-fg">{label(r.key)}</span>
          <span className="h-2 rounded-full bg-neutral-100" aria-hidden>
            <span className="block h-2 rounded-full bg-primary" style={{ width: `${r.percent}%` }} />
          </span>
          <span className="text-right text-fg-muted">{`${r.count} (%${r.percent})`}</span>
        </li>
      ))}
    </ul>
  );
}
