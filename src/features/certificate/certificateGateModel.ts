import type { ApprovalDto, ApprovalStatusDto } from "@/src/api/generated/models";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

// ───────────── onay durumu (GET/POST /policy/bundles/{id}/certificate-approvals) ─────────────

export const NOTE_MAX = 500;

export function approvalProgress(status: Pick<ApprovalStatusDto, "requiredApprovals" | "distinctApprovers">): { text: string; complete: boolean } {
  const required = status.requiredApprovals ?? 2;
  const distinct = status.distinctApprovers ?? 0;
  return { text: `${distinct}/${required} farklı onay`, complete: distinct >= required };
}

/**
 * `bundleConditionsMet` = demet bayrağı açık + iki farklı onay. Bu, sertifika kapısının AÇIK olduğu anlamına GELMEZ:
 * kalibrasyon koşulu bu uçta denetlenmez (`calibrationCheckedHere=false`). Gerçek kapı durumu ayrı rapordadır.
 */
export function bundleConditionsLabel(status: Pick<ApprovalStatusDto, "bundleConditionsMet" | "certificateEnabledFlag">): { label: string; tone: Tone } {
  if (!status.certificateEnabledFlag) return { label: "Demette sertifika bayrağı kapalı", tone: "warning" };
  if (status.bundleConditionsMet) return { label: "Demet koşulları sağlandı (bayrak açık + 2 onay)", tone: "success" };
  return { label: "Demet koşulları sağlanmadı", tone: "warning" };
}

/** Kullanıcı onay verebilir mi: bayrak açık, iki onaya ulaşılmadı, kullanıcı daha önce onaylamadı. Son karar sunucuda. */
export function canGiveApproval(status: Pick<ApprovalStatusDto, "certificateEnabledFlag" | "requiredApprovals" | "distinctApprovers" | "approvals">, userId?: string): boolean {
  if (!status.certificateEnabledFlag) return false;
  if ((status.distinctApprovers ?? 0) >= (status.requiredApprovals ?? 2)) return false;
  return !(status.approvals ?? []).some((a) => a.approvedBy === userId);
}

export function approverLabel(approval: Pick<ApprovalDto, "approvedBy">, userId?: string): string {
  if (!approval.approvedBy) return "—";
  return approval.approvedBy === userId ? "Siz" : `Kullanıcı ${approval.approvedBy.slice(0, 8)}`;
}

export function validateNote(note: string): string | null {
  return note.trim().length > NOTE_MAX ? `Not en fazla ${NOTE_MAX} karakter olabilir` : null;
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/** Onay hataları (403 merkez/izin; 409 bayrak kapalı, zaten onayladı, iki onay var; 400 not uzun) sunucu mesajıyla aynen. */
export function approvalFailureMessage(err: unknown): string {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if ((status === 409 || status === 403 || status === 400 || status === 404) && text) return text;
  return text || "Onay kaydedilemedi";
}

// ───────────── kapı hazırlık raporu (GET /policy/calibration-readiness) ─────────────
// Üretilmiş tip bu uç için YANLIŞ şemaya (AI `Evaluation`) bağlanıyor (aynı simple-name çakışması); gerçek yanıt aşağıdaki gibidir
// (backend `CalibrationReadinessReader.Evaluation`) ve elle tiplenir.

export type ReadinessCondition = { name: string; thresholdDefined: boolean; met: boolean; detail?: string | null };
export type ReadinessReport = {
  ready: boolean;
  conditions: ReadinessCondition[];
  scope?: { examId?: string; examVersionId?: string; formId?: string; scoredItemCount?: number } | null;
  inputs?: {
    calibratedItemRatio?: number | null;
    misfittingItemRatio?: number | null;
    standardSettingComplete?: boolean;
    difLevelCCount?: number | null;
    achievedAssuranceLevel?: string | null;
  } | null;
  thresholds?: {
    minCalibratedItemRatio?: number | null;
    maxMisfittingItemRatio?: number | null;
    maxDifLevelCCount?: number | null;
    minDifCoverageRatio?: number | null;
    minimumAssuranceLevel?: string | null;
  } | null;
  notes?: Record<string, string> | null;
};

export const CONDITION_LABEL: Record<string, string> = {
  CALIBRATED_ITEM_RATIO: "Kalibre madde oranı",
  ITEM_FIT: "Madde uyumu (item fit)",
  STANDARD_SETTING_COMPLETE: "Standart belirleme (iki onaylı kesme)",
  DIF_FLAGS: "DIF-C bayrakları ve kapsamı",
  EQUATING_ASSURANCE: "Eşitleme güvencesi",
};

export function conditionLabel(name?: string): string {
  return CONDITION_LABEL[name ?? ""] ?? name ?? "Koşul";
}

/** Koşulun durumu: eşik tanımsızsa "eşik tanımsız" (met her zaman false); karşılandı/karşılanmadı ayrı. */
export function conditionState(c: Pick<ReadinessCondition, "thresholdDefined" | "met">): { label: string; tone: Tone } {
  if (!c.thresholdDefined) return { label: "Eşik tanımsız", tone: "warning" };
  return c.met ? { label: "Karşılandı", tone: "success" } : { label: "Karşılanmadı", tone: "danger" };
}

/** Kapı kararı: tüm koşullar karşılanmadıkça KAPALI. Boş koşul listesi "açık" sayılmaz. */
export function gateVerdict(report: Pick<ReadinessReport, "ready" | "conditions">): { open: boolean; label: string; tone: Tone } {
  const all = report.conditions.length > 0 && report.conditions.every((c) => c.met);
  if (report.ready && all) return { open: true, label: "Sertifika kapısı AÇIK", tone: "success" };
  return { open: false, label: "Sertifika kapısı KAPALI", tone: "danger" };
}

export function missingConditions(report: Pick<ReadinessReport, "conditions">): ReadinessCondition[] {
  return report.conditions.filter((c) => !c.met);
}

export function percentText(value?: number | null): string {
  return value === undefined || value === null || Number.isNaN(value) ? "—" : `%${(value * 100).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function countText(value?: number | null): string {
  return value === undefined || value === null ? "—" : String(value);
}

/** Okunan değer / eşik çiftleri (rapor tablosu için). Okunamayan değer "—" (bilinmiyor), 0 gibi gösterilmez. */
export function readinessRows(report: ReadinessReport): { name: string; label: string; value: string; threshold: string; note?: string }[] {
  const i = report.inputs ?? {};
  const t = report.thresholds ?? {};
  const notes = report.notes ?? {};
  return [
    { name: "CALIBRATED_ITEM_RATIO", label: conditionLabel("CALIBRATED_ITEM_RATIO"), value: percentText(i.calibratedItemRatio), threshold: t.minCalibratedItemRatio == null ? "tanımsız" : `en az ${percentText(t.minCalibratedItemRatio)}` },
    { name: "ITEM_FIT", label: conditionLabel("ITEM_FIT"), value: percentText(i.misfittingItemRatio), threshold: t.maxMisfittingItemRatio == null ? "tanımsız" : `en çok ${percentText(t.maxMisfittingItemRatio)}` },
    { name: "STANDARD_SETTING_COMPLETE", label: conditionLabel("STANDARD_SETTING_COMPLETE"), value: i.standardSettingComplete ? "Tamam" : "Eksik", threshold: "iki onaylı yürürlükte kesme" },
    {
      name: "DIF_FLAGS",
      label: conditionLabel("DIF_FLAGS"),
      value: countText(i.difLevelCCount),
      threshold: t.maxDifLevelCCount == null ? "tanımsız" : `en çok ${t.maxDifLevelCCount} (kapsam ${t.minDifCoverageRatio == null ? "tanımsız" : `en az ${percentText(t.minDifCoverageRatio)}`})`,
    },
    { name: "EQUATING_ASSURANCE", label: conditionLabel("EQUATING_ASSURANCE"), value: i.achievedAssuranceLevel ?? "—", threshold: t.minimumAssuranceLevel ?? "tanımsız" },
  ].map((row) => ({ ...row, note: notes[row.name] }));
}

export function readinessFailureMessage(err: unknown): string {
  const status = statusOf(err);
  const text = err instanceof Error ? err.message.trim() : "";
  if (status === 403) return text || "Hazırlık raporu yalnız merkez yetkilisine açıktır.";
  if ((status === 400 || status === 404) && text) return text;
  return text || "Hazırlık raporu alınamadı";
}
