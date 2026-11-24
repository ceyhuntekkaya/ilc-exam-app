import type { ReportModel } from "@/src/api/generated/models";

export const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const ASSURANCE_LABEL: Record<string, string> = {
  EQUATED: "Eşitlenmiş",
  PRE_EQUATED: "Ön eşitlenmiş",
  BLUEPRINT_STRICT: "Blueprint (katı)",
  UNVERIFIED: "Doğrulanmamış",
};

export const INTEGRITY_LABEL: Record<string, string> = {
  UNPROCTORED: "Gözetimsiz",
  CLIENT_PROCTORED: "Kurum gözetimli",
  PARTNER_PROCTORED: "Partner gözetimli",
  ILC_PROCTORED: "ILC gözetimli",
};

export function cefrDisplay(level: string): string {
  return level === "PRE_A1" ? "Pre-A1" : level;
}

export interface DistributionRow { key: string; count: number; percent: number }

/** Verilen sıralamaya göre dağılım; sırada olmayan anahtarlar sona, sayıya göre azalan eklenir. */
export function distribution(reports: ReportModel[], key: (r: ReportModel) => string, order: readonly string[] = []): DistributionRow[] {
  const counts = new Map<string, number>();
  for (const r of reports) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  const total = reports.length || 1;
  const known = order.filter((k) => counts.has(k));
  const rest = [...counts.keys()].filter((k) => !order.includes(k)).sort((a, b) => counts.get(b)! - counts.get(a)!);
  return [...known, ...rest].map((k) => ({ key: k, count: counts.get(k)!, percent: Math.round((counts.get(k)! / total) * 100) }));
}

export interface Summary { total: number; passRate: number | null; avgPercent: number | null }

export function summarize(reports: ReportModel[]): Summary {
  const judged = reports.filter((r) => r.passed != null);
  const scored = reports.filter((r) => r.totalScore != null && r.maxScore != null && r.maxScore > 0);
  return {
    total: reports.length,
    passRate: judged.length ? Math.round((judged.filter((r) => r.passed).length / judged.length) * 100) : null,
    avgPercent: scored.length ? Math.round(scored.reduce((s, r) => s + (r.totalScore! / r.maxScore!) * 100, 0) / scored.length) : null,
  };
}

export function orgUnitIdOf(r: ReportModel): string | null {
  const v = r.membership?.orgUnitId;
  return typeof v === "string" && v ? v : null;
}

export interface UnitRow { unitId: string | null; count: number; avgPercent: number | null; topBand: string | null }

export function byUnit(reports: ReportModel[]): UnitRow[] {
  const groups = new Map<string | null, ReportModel[]>();
  for (const r of reports) {
    const id = orgUnitIdOf(r);
    groups.set(id, [...(groups.get(id) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([unitId, rs]) => ({
      unitId,
      count: rs.length,
      avgPercent: summarize(rs).avgPercent,
      topBand: distribution(rs.filter((r) => r.cefrLevel), (r) => r.cefrLevel!)
        .sort((a, b) => b.count - a.count || CEFR_ORDER.indexOf(b.key as never) - CEFR_ORDER.indexOf(a.key as never))[0]?.key ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}

export interface PeriodRow { period: string; count: number; bands: DistributionRow[] }

/** Yayın ayına (YYYY-MM) göre kohort; yayın tarihi olmayan sonuçlar dışarıda kalır. */
export function byMonth(reports: ReportModel[]): PeriodRow[] {
  const groups = new Map<string, ReportModel[]>();
  for (const r of reports) {
    if (!r.publishedAt) continue;
    const m = r.publishedAt.slice(0, 7);
    groups.set(m, [...(groups.get(m) ?? []), r]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([period, rs]) => ({ period, count: rs.length, bands: distribution(rs, (r) => r.cefrLevel ?? "—", CEFR_ORDER) }));
}
