/**
 * F3-07: üç saat var, karıştırılmaz (görev dosyası):
 * - `performance.now()` — geri sayım, monoton, cihaz saati değiştirilse de geriye gitmez;
 *   ama cihaz uykuya dalarsa bazı tarayıcılarda duraklayabilir.
 * - `Date.now()` — mutlak zaman damgası, kullanıcı değiştirebilir, SÜRE HESABINDA KULLANILMAZ.
 * - Sunucu saati — doğruluk kaynağı; `useExamClock`'a `clock` prop'uyla gelir (heartbeat yanıtı).
 *
 * Süre hesabı zaten tamamen sunucuda (`ExamClockService`, backend): bu modül yalnız YEREL
 * gösterimi (geri sayımın akıcı görünmesi) ve bir bütünlük sinyalini (cihaz uykusu tutarsızlığı,
 * `resolveWakeDrift`) üretir — ikisi de sunucunun süre kararını DEĞİŞTİRMEZ.
 */

export type ClockAnchor = { remaining: number | null; at: number; running: boolean };

/** Sunucudan gelen `remaining` değerini şu `performance.now()` okumasına sabitler. */
export function anchorClock(remaining: number | null, running: boolean): ClockAnchor {
  return { remaining, at: performance.now(), running };
}

/** Çapaya göre şu an kalan süre — `performance.now()` ile ara değer, sunucu saatiyle değil. */
export function interpolateRemaining(anchor: ClockAnchor): number | null {
  if (anchor.remaining == null) return null;
  if (!anchor.running) return anchor.remaining;
  return Math.max(0, anchor.remaining - (performance.now() - anchor.at));
}

export type SleepMark = { perf: number; wall: number };

/** Sekme gizlenirken (`visibilitychange`) iki saati birlikte damgalar. */
export function markSleepStart(): SleepMark {
  return { perf: performance.now(), wall: Date.now() };
}

/**
 * Sekme geri geldiğinde iki saatin aynı aralıkta ne kadar ilerlediği karşılaştırılır. Cihaz
 * uykudaysa `performance.now()` bazı tarayıcılarda duraklar — `perfMs` gerçekte geçenden az
 * çıkar, `wallMs` (duvar saati) doğru kalır. Fark tolerans dışındaysa MUHAFAZAKÂR olan (daha
 * çok süre geçmiş sayan, yani büyük olan) döner; `driftMs` o zaman bir bütünlük olayına
 * (`VISIBILITY_VISIBLE` yükü) yazılsın diye doldurulur, aksi halde `null` (gürültü olmasın).
 */
export function resolveWakeDrift(mark: SleepMark, toleranceMs = 2000): { elapsedMs: number; driftMs: number | null } {
  const perfMs = performance.now() - mark.perf;
  const wallMs = Date.now() - mark.wall;
  const driftMs = wallMs - perfMs;
  if (Math.abs(driftMs) <= toleranceMs) {
    return { elapsedMs: perfMs, driftMs: null };
  }
  return { elapsedMs: Math.max(perfMs, wallMs), driftMs };
}
