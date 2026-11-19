import type { AttemptProgress } from "@/src/api/generated/models";

/**
 * Öğrencinin bir sınavdaki katılım ve değerlendirme durumunun ekran dili. Sonuçlar tablosu ve dağıtım aday listesi
 * AYNI sunucu hesabını (AttemptProgressService) okur; etiketler de tek yerden gelir.
 *
 * Kurallar (2026-11-19): en az bir cevabı olmayan öğrenci "Girmedi"dir (K2); cevapsız elle puanlanan madde
 * değerlendirme dışıdır, yalnız cevabı olanlar "elle değerlendirme" sayısına girer (K1).
 */

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const FINISHED: Record<string, string> = {
  STUDENT_FINISHED: "Teslim etti",
  EXAM_TIME_UP: "Süre doldu",
  WINDOW_CLOSED: "Sınav kapandı",
  PROCTOR_LIMIT: "Odak sınırı aşıldı",
  STAFF: "Personel kapattı",
};

/** Katılım: girdi mi, girmedi mi, şu an sınavda mı. */
export function attendanceLabel(progress?: AttemptProgress | null): { label: string; detail?: string; tone: Tone } {
  switch (progress?.attendance) {
    case "TAKEN":
      return { label: FINISHED[progress.finishedReason ?? ""] ?? "Teslim edildi", tone: "success" };
    case "IN_EXAM":
      return progress.status === "IN_PROGRESS"
        ? { label: "Sınavda", tone: "info" }
        : { label: "Sınavı açtı", detail: "Henüz soruya başlamadı", tone: "info" };
    case "ABSENT":
      return {
        label: "Girmedi",
        detail: progress.absentReason === "NO_ANSWER" ? "Sorulara geldi, hiç cevap vermedi" : "Sınavı açtı, başlamadı",
        tone: "neutral",
      };
    case "INVALIDATED":
      return { label: "Geçersiz", detail: "Personel geçersiz saydı", tone: "danger" };
    default:
      return { label: "Girmedi", detail: "Sınavı hiç açmadı", tone: "neutral" };
  }
}

/** Değerlendirme: tamam mı, ne eksik. Girmeyen ve sınavı süren öğrencide değerlendirme yoktur. */
export function evaluationLabel(progress?: AttemptProgress | null): { label: string; detail?: string; tone: Tone } {
  if (!progress || progress.attendance === "NOT_STARTED" || progress.attendance === "ABSENT") {
    return { label: "Değerlendirme dışı", tone: "neutral" };
  }
  if (progress.attendance === "INVALIDATED") {
    return { label: "Puanlanmaz", tone: "neutral" };
  }
  if (progress.attendance === "IN_EXAM") {
    return { label: "Sınav sürüyor", tone: "neutral" };
  }
  const pending = progress.manualPending ?? 0;
  const total = progress.manualTotal ?? 0;
  switch (progress.gradingState) {
    case "PUBLISHED":
      return { label: "Yayınlandı", tone: "brand" };
    case "READY":
      return { label: "Değerlendirme tamam", detail: total > 0 ? `Elle değerlendirme ${total}/${total}` : undefined, tone: "success" };
    case "AWAITING_MANUAL":
      return {
        label: "Tamamlanmadı",
        detail: `Otomatik tamam · elle değerlendirme ${pending} eksik (${total - pending}/${total})`,
        tone: "warning",
      };
    case "AWAITING_AUTO":
      return { label: "Tamamlanmadı", detail: "Otomatik değerlendirme bekliyor", tone: "warning" };
    case "GRACE":
      return { label: "Tamamlanmadı", detail: "Son cevaplar bekleniyor (birkaç dakika)", tone: "info" };
    default:
      return { label: "Tamamlanmadı", tone: "warning" };
  }
}

/** Satıra tıklanıp kâğıdı açılabilir mi: cevabı olan teslim ya da süren sınav. Girmeyen tıklanamaz. */
export function canOpenPaper(progress?: AttemptProgress | null): boolean {
  if (!progress?.applicationId) return false;
  return progress.attendance === "TAKEN" || (progress.attendance === "IN_EXAM" && progress.status === "IN_PROGRESS");
}

/** Yayınla: değerlendirme tamam ama yayınlanmamış. */
export function canPublish(progress?: AttemptProgress | null): boolean {
  return Boolean(progress?.evaluationComplete && !progress.published && progress.gradingState === "READY");
}

/** Karne: değerlendirme tamam ve sonuç kaydı var. */
export function canPrintReportCard(progress?: AttemptProgress | null): boolean {
  return Boolean(progress?.evaluationComplete && progress.resultId);
}

export type ProgressCounts = {
  total: number;
  notTaken: number;
  inExam: number;
  taken: number;
  pending: number;
  complete: number;
  published: number;
};

/** Üst sayaçlar: kaç kişi girmedi, sınavda, teslim etti, değerlendirmesi eksik/tamam, yayınlandı. */
export function progressCounts(rows: (AttemptProgress | null | undefined)[]): ProgressCounts {
  const counts: ProgressCounts = { total: rows.length, notTaken: 0, inExam: 0, taken: 0, pending: 0, complete: 0, published: 0 };
  for (const progress of rows) {
    switch (progress?.attendance) {
      case "TAKEN":
        counts.taken++;
        if (progress.published) counts.published++;
        else if (progress.evaluationComplete) counts.complete++;
        else counts.pending++;
        break;
      case "IN_EXAM":
        counts.inExam++;
        break;
      case "INVALIDATED":
        break;
      default:
        counts.notTaken++;
    }
  }
  return counts;
}
