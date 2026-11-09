/**
 * R-30: AI puanlama kuyruğunun ekran modeli (saf fonksiyonlar). Rozet metinleri tek yerde; görev dosyasındaki Türkçe
 * karşılıklar birebir. Kart bileşeni (`AnswerReviewCard`) ve testler buradan okur.
 */
import type { RunStatus } from "@/src/api/generated/models";

/** Cevabın insan kuyruğuna düşme nedeni (QueueItem / HumanQueueItem ortak değerleri). */
export type EscapeReasonCode =
  | "EMPTY"
  | "TOO_SHORT"
  | "NONSENSE"
  | "SUSPICIOUS"
  | "MODEL_ERROR"
  | "PROMPT_MISSING"
  | "MODEL_NOT_CONFIGURED"
  | "STT_NOT_CONFIGURED"
  | "POLICY_HUMAN";

export const ESCAPE_REASON_TEXT: Record<EscapeReasonCode, string> = {
  PROMPT_MISSING: "Bu sorunun AI metni yok",
  MODEL_NOT_CONFIGURED: "Dil modeli ayarlanmamış",
  STT_NOT_CONFIGURED: "Ses tanıma ayarlanmamış",
  POLICY_HUMAN: "Bu sınav insan puanlaması istiyor",
  MODEL_ERROR: "AI değerlendiremedi",
  SUSPICIOUS: "Olası talimat içeriği",
  EMPTY: "Cevap boş",
  TOO_SHORT: "Cevap çok kısa",
  NONSENSE: "Cevap anlamsız görünüyor",
};

export function escapeReasonText(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return ESCAPE_REASON_TEXT[reason as EscapeReasonCode] ?? reason;
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";
export type StatusBadge = { key: string; label: string; tone: BadgeTone };

/** Kartın rozetlerini üreten alanlar (QueueItem ve HumanQueueItem'dan ortak okunur). */
export type BadgeSource = {
  jobStatus?: string | null;
  escapeReason?: string | null;
  scoreSource?: string | null;
  reviewedBy?: string | null;
  scored?: boolean;
  /** Yalnız insan kuyruğu ucu verir (`HumanQueueItem.auditPending`). */
  auditPending?: boolean | null;
};

/** AI puanı verilmiş, hiçbir insan bakmamış. */
export function isUnreviewedAi(item: Pick<BadgeSource, "scoreSource" | "reviewedBy">): boolean {
  return item.scoreSource === "AI_ACCEPTED" && !item.reviewedBy;
}

/** İş sürüyor mu (liste kendiliğinden yenilenir). */
export function isJobActive(jobStatus: string | null | undefined): boolean {
  return jobStatus === "PENDING" || jobStatus === "RUNNING";
}

/**
 * Rozet eşlemesi (R-30 adım 1):
 * PENDING/RUNNING → "Sırada" / "AI değerlendiriyor"; AI_ACCEPTED + reviewedBy boş → "AI puanı — gözden geçirilmedi"
 * (+ örneklemdeyse "Denetim bekliyor"); escapeReason doluysa insan kuyruğu nedeni okunur Türkçe ile.
 */
export function answerBadges(item: BadgeSource): StatusBadge[] {
  const out: StatusBadge[] = [];
  if (item.jobStatus === "PENDING") out.push({ key: "job", label: "Sırada", tone: "info" });
  else if (item.jobStatus === "RUNNING") out.push({ key: "job", label: "AI değerlendiriyor", tone: "info" });
  else if (item.jobStatus === "DEAD") out.push({ key: "job", label: "AI işi başarısız", tone: "danger" });
  else if (item.jobStatus === "AWAITING_REVIEW") out.push({ key: "job", label: "İnsan bekliyor", tone: "warning" });

  if (isUnreviewedAi(item)) {
    out.push({ key: "unreviewed", label: "AI puanı — gözden geçirilmedi", tone: "warning" });
  }
  if (item.auditPending) {
    out.push({ key: "audit", label: "Denetim bekliyor", tone: "brand" });
  }
  const reason = escapeReasonText(item.escapeReason);
  if (reason && !item.scored) {
    out.push({ key: "reason", label: reason, tone: "neutral" });
  }
  return out;
}

/** Koşum yoklaması: bitti = sırada/çalışan iş kalmadı. */
export function runFinished(status: Pick<RunStatus, "pending" | "running"> | undefined): boolean {
  return status != null && (status.pending ?? 0) === 0 && (status.running ?? 0) === 0;
}

export type RunProgress = { total: number; finished: number; awaitingReview: number; failed: number; done: boolean };

/** Birden çok koşumun (atama başına bir) toplamı: "x / y bitti, z insan bekliyor". */
export function aggregateRuns(statuses: (RunStatus | undefined)[]): RunProgress {
  let total = 0;
  let finished = 0;
  let awaitingReview = 0;
  let failed = 0;
  let allKnown = statuses.length > 0;
  for (const s of statuses) {
    if (!s) {
      allKnown = false;
      continue;
    }
    total += s.total ?? 0;
    finished += (s.total ?? 0) - (s.pending ?? 0) - (s.running ?? 0);
    awaitingReview += s.awaitingReview ?? 0;
    failed += s.failed ?? 0;
  }
  const done = allKnown && statuses.every((s) => runFinished(s));
  return { total, finished, awaitingReview, failed, done };
}

export function runProgressText(p: RunProgress): string {
  return `${p.finished} / ${p.total} bitti, ${p.awaitingReview} insan bekliyor`;
}

/** Atlanan sayıların özeti ("sıraya alınan / atlanan"). */
export function runSummaryText(s: {
  queued?: number;
  skippedScored?: number;
  skippedGrace?: number;
  skippedPublished?: number;
  skippedActive?: number;
}): string {
  const skipped =
    (s.skippedScored ?? 0) + (s.skippedGrace ?? 0) + (s.skippedPublished ?? 0) + (s.skippedActive ?? 0);
  const parts = [`${s.queued ?? 0} cevap sıraya alındı`];
  if (skipped > 0) {
    const why: string[] = [];
    if (s.skippedScored) why.push(`${s.skippedScored} zaten puanlı`);
    if (s.skippedGrace) why.push(`${s.skippedGrace} süre penceresinde`);
    if (s.skippedPublished) why.push(`${s.skippedPublished} yayınlanmış`);
    if (s.skippedActive) why.push(`${s.skippedActive} zaten sırada`);
    parts.push(`${skipped} atlandı (${why.join(", ")})`);
  }
  return parts.join(", ");
}
