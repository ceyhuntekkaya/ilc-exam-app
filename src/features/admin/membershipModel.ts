import type { BackfillReport, BackfillRequest } from "@/src/api/generated/models";

/** Gerçek koşum onay ifadesi (ConfirmDialog'da yazdırılır). */
export const BACKFILL_PHRASE = "ÇALIŞTIR";

/** Sayfa boyutu (sunucu üst sınırı 100). */
export const INCOMPLETE_PAGE_SIZE = 50;

/** Kuru koşum gövdesi: `dryRun: true` AÇIKÇA gönderilir (sunucu varsayılanına güvenilmez). Kurum boşsa tüm kurumlar. */
export function dryRunBody(companyId: string): BackfillRequest {
  const id = companyId.trim();
  return id ? { companyId: id, dryRun: true } : { dryRun: true };
}

export function executeBody(companyId: string): BackfillRequest {
  const id = companyId.trim();
  return id ? { companyId: id, dryRun: false } : { dryRun: false };
}

export type BackfillGate = { allowed: boolean; reason: string | null };

/**
 * Gerçek koşum kuralı (panelin ek emniyeti, sunucu kuralı değil): aynı kapsamda (aynı kurum ya da "tüm kurumlar")
 * bu oturumda bir KURU KOŞUM yapılmış olmalı.
 */
export function backfillGate(args: { dryRunScope: string | null; scope: string }): BackfillGate {
  if (args.dryRunScope === null || args.dryRunScope !== args.scope.trim()) {
    return { allowed: false, reason: "Önce aynı kapsamda bir kuru koşum yapın ve sonucu inceleyin." };
  }
  return { allowed: true, reason: null };
}

export function backfillFailureMessage(err: unknown): string {
  const text = err instanceof Error ? err.message.trim() : "";
  return text || "Üyelik geri doldurma başarısız oldu.";
}

export function isDryRunReport(report?: BackfillReport | null): boolean {
  return report?.dryRun !== false;
}

export function missingLabels(row: { missingOrgUnit?: boolean; missingAcademicYear?: boolean }): string[] {
  const out: string[] = [];
  if (row.missingOrgUnit) out.push("Birim yok");
  if (row.missingAcademicYear) out.push("Sezon yok");
  return out;
}
