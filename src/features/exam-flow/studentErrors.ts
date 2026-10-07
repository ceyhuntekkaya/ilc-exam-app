/**
 * Öğrenci paneli hata metinleri (İngilizce, A1–A2, "ne oldu + ne yapmalı").
 * Backend'in ham `error` metni (çoğu Türkçe/teknik) öğrenciye GÖSTERİLMEZ; sebep kod, HTTP durumu ve metindeki
 * ipuçlarından çıkarılır. Ham metin geliştirici için konsola yazılır.
 */

export type StudentErrorContext = "upload" | "exam";

type ErrorInput = {
  status?: number;
  code?: string;
  /** Backend'in ham mesajı (yalnız sebep tahmini ve konsol için). */
  raw?: string;
};

const BY_CODE: Record<string, string> = {
  NO_ATTEMPTS: "You have no tries left for this test.",
  SESSION_REPLACED: "This test is open in another window or device. Please use only one.",
  SESSION_EXPIRED: "Your test session ended. Please open the test again.",
  ATTEMPT_LIMIT: "You have no tries left for this question.",
  FILE_TOO_LARGE: "This file is too big. Please choose a smaller file.",
  PAYLOAD_TOO_LARGE: "This file is too big. Please choose a smaller file.",
  UNSUPPORTED_MEDIA_TYPE: "You cannot use this type of file. Please choose a different file.",
  INVALID_FILE_TYPE: "You cannot use this type of file. Please choose a different file.",
  TIME_UP: "Time is up for this part.",
  SECTION_CLOSED: "This part is closed. You cannot change answers now.",
};

/** Metindeki ipucu → sebep (Türkçe ve İngilizce anahtar kelimeler). İlk eşleşen kazanır. */
// Yalnız kelime BAŞINDA eşleşir (Türkçe harfler dahil) ve belirgin ifadeler kullanılır: "mul-tip-art" içindeki
// "tip" ya da "hakkında" gibi kelime içi / genel parçalar yanlış sebep üretmesin. Kelime sonu serbest (Türkçe ekler).
const W = "(?<![a-zçğıöşü0-9])";
const HINTS: Array<[RegExp, string]> = [
  [new RegExp(`${W}(?:(deneme )?hakkı(nız)? (bitti|kalmadı|yok)|no (more )?attempts|attempt limit|no tries)`, "iu"), "You have no tries left for this question."],
  [new RegExp(`${W}(?:boyut|çok büyük|mb(?![a-z])|file size|too large|too big|payload too)`, "iu"), "This file is too big. Please choose a smaller file."],
  [new RegExp(`${W}(?:dosya türü|dosya tipi|uzantı|desteklenmeyen|mime|file type|extension|unsupported)`, "iu"), "You cannot use this type of file. Please choose a different file."],
  [new RegExp(`${W}(?:çok uzun|duration|too long)`, "iu"), "This recording is too long. Please make a shorter one."],
  [new RegExp(`${W}(?:boş dosya|dosya boş|empty file|file is empty|0 bytes?)`, "iu"), "The file is empty. Please try again."],
  [new RegExp(`${W}(?:oturum|session)`, "iu"), "Your test session ended. Please open the test again."],
  [new RegExp(`${W}(?:kapalı|kapandı|closed|expired)`, "iu"), "This part is closed. You cannot change answers now."],
];

function byStatus(status: number | undefined, context: StudentErrorContext): string {
  if (status == null || status === 0) return "No internet connection. Check your internet and try again.";
  if (status === 401) return "You are signed out. Please sign in again.";
  if (status === 403) return "You cannot do this now. The test may be closed.";
  if (status === 404) return "We could not find this. Please refresh the page.";
  if (status === 409) return "This test changed. Please refresh the page.";
  if (status === 413) return "This file is too big. Please choose a smaller file.";
  if (status === 415) return "You cannot use this type of file. Please choose a different file.";
  if (status === 429) return "Too many tries. Wait a moment and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return context === "upload"
    ? "We could not save your file. Please try again or choose a different file."
    : "Something went wrong. Please try again.";
}

export function studentErrorMessage(input: ErrorInput, context: StudentErrorContext): string {
  const { status, code, raw } = input;
  if (raw || code || status) {
    // Öğretmen/geliştirici gerçek sebebi konsolda görebilsin.
    console.warn(`[student-error:${context}]`, { status, code, raw });
  }
  if (code && BY_CODE[code]) return BY_CODE[code];
  // Anlamı kesin durumlar metin ipucundan önce.
  if (status === 401 || status === 413 || status === 415 || status === 429) return byStatus(status, context);
  if (raw) {
    for (const [pattern, message] of HINTS) if (pattern.test(raw)) return message;
  }
  return byStatus(status, context);
}
