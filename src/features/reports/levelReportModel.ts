import type { CertificateAvailability, JobView } from "@/src/api/generated/models";

/**
 * R-20 (B-25): seviye raporu (PDF) indirme modeli. Rapor sonuç yayınında ARKA PLANDA üretilir ve saklanır; yayından hemen
 * sonra kısa süre "hazırlanıyor" olabilir (süpürme 60 sn). İndirme her zaman SAKLANAN aynı dosyadır (aynı SHA-256).
 * Seviye raporu bir SERTİFİKA DEĞİLDİR; sertifika kapısından geçmez.
 */

export type LevelReportView =
  | { kind: "unknown" }
  | { kind: "preparing" }
  | { kind: "ready"; downloadPath: string; verificationUrl: string | null };

/** İndirme yolu yalnız adayın KENDİ sonucunun seviye raporu ucu olabilir (sunucudan gelen başka bir yol kabul edilmez). */
export function myLevelReportPath(applicationResultId: string, serverPath?: string | null): string {
  const expected = `/report/me/results/${applicationResultId}/level-report`;
  const path = serverPath && serverPath === expected ? serverPath : expected;
  return `/api/backend${path}`;
}

export function staffLevelReportPath(companyId: string, applicationResultId: string): string {
  return `/api/backend/report/companies/${companyId}/results/${applicationResultId}/level-report`;
}

/**
 * `levelReportReady` yoksa (eski sunucu) durum BİLİNMİYOR — "hazırlanıyor" demek yanıltıcı olur, kart gösterilmez.
 * `false`: hazırlanıyor (yeniden sorgulanır). `true`: indirilebilir; doğrulama bağlantısı yalnız hazırsa gelir.
 */
export function toLevelReportView(data: CertificateAvailability | undefined | null, applicationResultId: string): LevelReportView {
  if (!data || typeof data.levelReportReady !== "boolean") return { kind: "unknown" };
  if (!data.levelReportReady) return { kind: "preparing" };
  return {
    kind: "ready",
    downloadPath: myLevelReportPath(applicationResultId, data.levelReportUrl),
    verificationUrl: data.levelReportVerificationUrl || null,
  };
}

export const LEVEL_REPORT_POLL_MS = 5_000;
/** 5 sn × 24 = 2 dk: süpürme (60 sn) ve hızlı yol bu sürede üretir; sonrası elle "Yeniden sorgula". */
export const LEVEL_REPORT_MAX_POLLS = 24;

/** Rapor hazır değilken yeniden sorgu aralığı (ms); hazır/bilinmiyor/üst sınır aşıldıysa `false` (sorgulamayı bırak). */
export function levelReportRefetchInterval(ready: boolean | undefined, polls: number): number | false {
  if (ready !== false) return false;
  return polls < LEVEL_REPORT_MAX_POLLS ? LEVEL_REPORT_POLL_MS : false;
}

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
}

/** 404: belge yok / henüz hazır değil / başkasının (varlık sızdırılmaz, tek mesaj). */
export function levelReportDownloadFailure(err: unknown): string {
  const status = statusOf(err);
  if (status === 404) return "Seviye raporu henüz hazır değil ya da bu sonuç için bulunamadı. Biraz sonra yeniden deneyin.";
  if (status === 401) return "Oturumunuz sona ermiş. Lütfen yeniden giriş yapın.";
  if (status === 403) return "Bu raporu indirme yetkiniz yok.";
  const text = err instanceof Error ? err.message.trim() : "";
  return text || "Seviye raporu indirilemedi.";
}

/** Paylaşım için yalnız http(s) bağlantısı kabul edilir. */
export function safeShareUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

// ── Ölü mektup (merkez) ────────────────────────────────────────────────────────────────────────────

export type JobStatusFilter = "DEAD" | "PENDING" | "SUCCEEDED" | "CANCELLED";

export const JOB_STATUS_FILTERS: { value: JobStatusFilter; label: string }[] = [
  { value: "DEAD", label: "Ölü mektup" },
  { value: "PENDING", label: "Bekleyen" },
  { value: "SUCCEEDED", label: "Başarılı" },
  { value: "CANCELLED", label: "İptal" },
];

type JobTone = "danger" | "warning" | "success" | "neutral";

const JOB_STATUS_LABELS: Record<string, { label: string; tone: JobTone }> = {
  DEAD: { label: "Ölü mektup", tone: "danger" },
  PENDING: { label: "Bekliyor", tone: "warning" },
  SUCCEEDED: { label: "Üretildi", tone: "success" },
  CANCELLED: { label: "İptal", tone: "neutral" },
};

export function jobStatusView(status?: string | null): { label: string; tone: JobTone } {
  return JOB_STATUS_LABELS[status ?? ""] ?? { label: status || "—", tone: "neutral" };
}

/** `kind`: LIVE (yayında üretilen) | BACKFILL (geriye dönük toplu onarım). */
export function jobKindLabel(kind?: string | null): string {
  if (kind === "LIVE") return "Yayın anı";
  if (kind === "BACKFILL") return "Geriye dönük";
  return kind || "—";
}

/** Yalnız DEAD işler yeniden kuyruğa alınabilir (sunucu diğerlerinde 404 döner). */
export function canRequeue(job: Pick<JobView, "status">): boolean {
  return job.status === "DEAD";
}

export const JOB_LIMIT_DEFAULT = 100;

/** Toplu yeniden kuyruklama yalnız listede ölü mektup varken ve "Ölü mektup" süzgeciyle anlamlıdır. */
export function canRequeueAll(filter: JobStatusFilter, jobs: readonly Pick<JobView, "status">[]): boolean {
  return filter === "DEAD" && jobs.some(canRequeue);
}

export function requeueFailureMessage(err: unknown): string {
  const status = statusOf(err);
  if (status === 404) return "İş bulunamadı ya da artık ölü mektup değil; listeyi yenileyin.";
  if (status === 403) return "Bu işlem için psikometri yönetimi yetkisi ve merkez erişimi gerekir.";
  const text = err instanceof Error ? err.message.trim() : "";
  return text || "İş yeniden kuyruğa alınamadı.";
}
