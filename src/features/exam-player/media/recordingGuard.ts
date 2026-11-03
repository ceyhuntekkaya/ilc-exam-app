"use client";

/**
 * F3-10: izin, süre (grace hizalaması) ve kota kararlarının TEK yeri. `ResponseViews.tsx`'teki
 * Audio/Video kayıt akışları ve `checks/page.tsx`'in (ayrı, kendi hata haritası — buraya
 * taşınmadı, dosyalar listesinde değildi) BAĞIMSIZ kopyaları yerine paylaşılan saf kararlar.
 *
 * Grace penceresi hizalaması: sunucu zaten `application.mediaGraceUntil`/`section
 * .mediaGraceUntil`'i (cevap penceresinden AYRI, daha uzun) kullanıyor ve F3-09'un
 * `EffectiveDuration`'ı o bütçeyi önceden büyütüyor — `timeRemainingMs` burada istemcinin
 * ZATEN doğru (düzenleme profiliyle büyümüş) sayduğu bir değerdir, bu dosya onu YENİDEN
 * hesaplamaz, yalnız "sıfıra indi mi" sorusuna karar verir.
 */

export type RecordingDenial = { denied: boolean; message: string };

/** getUserMedia/MediaRecorder hatasını öğrenciye anlaşılır mesaja çevirir. */
export function classifyRecordingError(err: unknown, needsCamera: boolean): RecordingDenial {
  const name = err instanceof DOMException ? err.name : "";
  const device = needsCamera ? "camera and microphone" : "microphone";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return { denied: true, message: `We need your ${device}. Please allow it and try again.` };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return { denied: false, message: `We cannot find your ${device}. Check that it is plugged in and try again.` };
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return { denied: false, message: `Another app may be using your ${device}. Close that app and try again.` };
  }
  return { denied: false, message: `We need your ${device}. Please allow it and try again.` };
}

/**
 * Kural 1: "Süre bittiğinde kayıt devam ediyorsa ne olur?" — sıfıra indiyse AKTİF bir kayıt
 * durdurulmalı (dosya kuyruğa girer, grace penceresi içinde kabul edilir — sunucu tarafı
 * ZATEN böyle, bkz. `AnswerWritePolicy`). `remainingMs` yoksa (süresiz sınav/önizleme) hiçbir
 * zaman true dönmez — zorlanacak bir sınır yok.
 */
export function timeIsUp(remainingMs: number | null | undefined): boolean {
  return remainingMs != null && remainingMs <= 0;
}

/**
 * Kural 2 (çevrimdışı dayanıklılık): kota uyarısı — ADVISORY, hiçbir yazmayı ENGELLEMEZ
 * (F3-05'in `packageStore.ts`'teki `checkStorageQuota` örüntüsü, burada "durdur" yerine
 * "uyar" — bir ses/video kaydını iptal etmek cevabı kaybetmek demektir, bu asla yapılmaz).
 */
export async function checkMediaQuota(estimatedExtraBytes: number): Promise<{ lowSpace: boolean; message: string | null }> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return { lowSpace: false, message: null };
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota <= 0) return { lowSpace: false, message: null };
    const ratio = (usage + estimatedExtraBytes) / quota;
    if (ratio >= 0.9) {
      return { lowSpace: true, message: "Your device storage is almost full. Finish and send your recordings soon." };
    }
    return { lowSpace: false, message: null };
  } catch {
    return { lowSpace: false, message: null };
  }
}

/** Bir yüklemenin ne kadar süredir (ms) kuyrukta "sıkışık" kaldığını göstermek için eşik. */
export const STUCK_UPLOAD_THRESHOLD_MS = 15_000;
