/**
 * Konuşma cevabının süre kuralları (AUDIO_RESPONSE). Saf fonksiyonlar: bileşen zamanı buradan okur,
 * böylece MediaRecorder olmadan (jsdom) test edilebilir.
 */

/** Geri sayımda kalan tam saniye (yukarı yuvarlanır; 0 = süre doldu). */
export function secondsLeft(totalSec: number, startedAtMs: number, nowMs: number): number {
  if (!(totalSec > 0)) return 0;
  const leftMs = totalSec * 1000 - Math.max(0, nowMs - startedAtMs);
  return leftMs <= 0 ? 0 : Math.ceil(leftMs / 1000);
}

/**
 * "Done" düğmesi en kısa konuşma süresi dolana kadar kilitli. speakStartedAtMs null ise öğrenci henüz
 * konuşmaya başlamadı (ör. 3 sn'lik sessiz giriş sürüyor): kilit tam süre kadar.
 */
export function finishLockSeconds(minSec: number | null | undefined, speakStartedAtMs: number | null, nowMs: number): number {
  if (minSec == null || !(minSec > 0)) return 0;
  if (speakStartedAtMs == null) return Math.ceil(minSec);
  return secondsLeft(minSec, speakStartedAtMs, nowMs);
}

/** Konuşma başladığını duyuran kısa bip. Dokunuşta açılmış AudioContext ile çalınır (iOS). */
export function playStartBeep(ctx: AudioContext | null | undefined): void {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  } catch {
    // Bip yalnız ipucu: çalınamazsa ekrandaki "Recording" yazısı yeter.
  }
}
