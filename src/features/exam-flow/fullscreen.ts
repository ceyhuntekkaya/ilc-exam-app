/**
 * Sınav tam ekranı. Tarayıcı tam ekranı yalnızca bir tıklamanın içinde açar;
 * Esc ile çıkışı kalıcı kilitlemez. Chrome ve Edge'de Esc, tam ekrandayken
 * keyboard.lock ile zorlaşır. Safari ve Firefox bu kilidi desteklemez.
 */

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type KeyboardLock = {
  lock: (keyCodes?: string[]) => Promise<void>;
  unlock: () => void;
};

let mediaHeld = false;
let nativeExamActive = false;

type ExamGuardPlugin = {
  startExam: () => Promise<unknown>;
  stopExam: () => Promise<unknown>;
  openAppSettings: () => Promise<unknown>;
};

/**
 * Android uygulaması (ilc-exam-mobile-app) içinde mi? Uygulama WebView'da tarayıcı tam ekranı çalışmaz; tam ekranı,
 * uygulama sabitlemeyi ve geri tuşu kilidini native ExamGuard eklentisi sağlar. Burada "tam ekran" = native sınav kilidi.
 */
function nativeExamGuard(): ExamGuardPlugin | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return null;
  if (!navigator.userAgent.includes("ILCExamApp/")) return null;
  const plugins = (window as Window & { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor?.Plugins;
  return (plugins?.ExamGuard as ExamGuardPlugin | undefined) ?? null;
}

export function isNativeExamApp() {
  return nativeExamGuard() != null;
}

/** Uygulamada kamera/mikrofon izni kalıcı reddedildiyse Android uygulama ayarlarını açar (ayrılış ihlal sayılmaz). */
export async function openNativeAppSettings() {
  const guard = nativeExamGuard();
  if (!guard) return;
  expectFullscreenExit();
  await guard.openAppSettings().catch(() => undefined);
}
let expectedExitUntil = 0;

/** Beklenen çıkış penceresi: bu süre içinde dönülmezse çıkış ihlal sayılır ve sınav durur. */
export const EXPECTED_EXIT_MS = 90_000;

/**
 * Tarayıcı izin penceresi (mikrofon/kamera) ve dosya seçici açılırken güvenlik gereği tam ekrandan çıkar; sayfa bunu
 * engelleyemez. Öğrencinin kendi başlattığı bu işlemlerden ÖNCE çağrılır: bu süre içindeki çıkış ihlal sayılmaz,
 * sınav durmaz ve öğrencinin bir sonraki dokunuşunda tam ekran geri açılır (ExamFlowProvider).
 */
export function expectFullscreenExit() {
  // Koşulsuz: öğrenci yumuşak moddayken (tam ekran dışı) yükle'ye basarsa, aynı dokunuşla geri açılan tam ekran
  // seçici yüzünden yeniden kapanabilir; o çıkış da beklenen sayılmalı.
  expectedExitUntil = Date.now() + EXPECTED_EXIT_MS;
}

export function isFullscreenExitExpected() {
  return Date.now() < expectedExitUntil;
}

/** İşlem bitti ve tam ekrandan hiç çıkılmadı (izin zaten verilmişti / seçici çıkarmadı): pencereyi kapat. */
export function settleExpectedExit() {
  if (isExamFullscreen()) expectedExitUntil = 0;
}

/**
 * Tarayıcı tam ekran çıkışını işlem bittikten SONRA da bildirebilir (Android Chrome / iPadOS'ta izin penceresi kapanırken
 * `fullscreenchange` getUserMedia çözüldükten sonra gelir). Pencereyi hemen kapatmak bu geç çıkışı ihlal saydırıp
 * kapıyı açıyordu; kısa bir gecikmeyle kapatılır.
 */
export const SETTLE_DELAY_MS = 1500;

export function settleExpectedExitSoon() {
  if (typeof window === "undefined") return;
  window.setTimeout(settleExpectedExit, SETTLE_DELAY_MS);
}

/** İzin isteyen işlemi (getUserMedia) beklenen çıkış penceresi içinde çalıştırır. */
export async function withExpectedExit<T>(work: () => Promise<T>): Promise<T> {
  expectFullscreenExit();
  try {
    return await work();
  } finally {
    settleExpectedExitSoon();
  }
}

/**
 * iPad / iPhone Safari: ekran klavyesi açılınca tarayıcı tam ekrandan çıkar (sayfa engelleyemez). Yazı alanına odaklanmak
 * bu yüzden beklenen çıkıştır. (iPadOS kendini "Macintosh" diye tanıtır: dokunma noktası sayısıyla ayırt edilir.)
 */
export function isAppleTouchDevice() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function clearExpectedExit() {
  expectedExitUntil = 0;
}

export function expectedExitRemainingMs() {
  return Math.max(0, expectedExitUntil - Date.now());
}

export function isExamMediaHeld() {
  return mediaHeld;
}

export function isExamFullscreen() {
  if (typeof document === "undefined") return false;
  if (isNativeExamApp()) return nativeExamActive;
  const doc = document as WebkitDocument;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export function canRequestFullscreen() {
  if (typeof document === "undefined") return false;
  if (isNativeExamApp()) return true;
  const node = document.documentElement as FullscreenElement;
  return typeof node.requestFullscreen === "function" || typeof node.webkitRequestFullscreen === "function";
}

/** Çalan ses/videoyu dondurur. Oynatıcı, sınav kilidi varken kendiliğinden devam ettirmez. */
export function holdExamMedia() {
  mediaHeld = true;
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio, video").forEach((node) => {
    if (!(node instanceof HTMLMediaElement) || node.paused || node.ended) return;
    node.dataset.examHold = "1";
    node.pause();
  });
}

/** Tam ekrana dönünce, çıkışta duran medyayı kaldığı yerden sürdürür. */
export function releaseExamMediaHold() {
  mediaHeld = false;
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio, video").forEach((node) => {
    if (!(node instanceof HTMLMediaElement) || node.dataset.examHold !== "1") return;
    delete node.dataset.examHold;
    void node.play().catch(() => undefined);
  });
}

export async function enterExamFullscreen() {
  const guard = nativeExamGuard();
  if (guard) {
    nativeExamActive = true;
    await guard.startExam().catch(() => undefined);
    return;
  }
  if (!isExamFullscreen()) {
    const node = typeof document === "undefined" ? null : (document.documentElement as FullscreenElement);
    if (!node) throw new Error("Fullscreen is not supported");
    if (node.requestFullscreen) {
      try {
        await node.requestFullscreen({ navigationUI: "hide" });
      } catch (err) {
        if (!isExamFullscreen()) {
          if (err instanceof TypeError) await node.requestFullscreen();
          else throw err;
        }
      }
    } else if (node.webkitRequestFullscreen) {
      await Promise.resolve(node.webkitRequestFullscreen());
    } else {
      throw new Error("Fullscreen is not supported");
    }
  }
  if (!isExamFullscreen()) throw new Error("Fullscreen is not supported");
  await lockExamEscape();
}

export async function exitExamFullscreen() {
  releaseExamMediaHold();
  unlockExamEscape();
  const guard = nativeExamGuard();
  if (guard) {
    nativeExamActive = false;
    await guard.stopExam().catch(() => undefined);
    return;
  }
  if (!isExamFullscreen()) return;
  const doc = document as WebkitDocument;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (doc.webkitExitFullscreen) await Promise.resolve(doc.webkitExitFullscreen());
  } catch {
    // Çıkış zaten olduysa veya tarayıcı reddettiyse sınav ekranı normal kalsın.
  }
}

export async function lockExamEscape() {
  const keyboard = examKeyboard();
  if (!keyboard || !isExamFullscreen()) return;
  try {
    await keyboard.lock(["Escape"]);
  } catch {
    // Safari ve Firefox keyboard.lock desteklemez; Esc ile çıkış yine yakalanır.
  }
}

function unlockExamEscape() {
  try {
    examKeyboard()?.unlock();
  } catch {
    // Kilit hiç alınmadıysa unlock hata verebilir.
  }
}

function examKeyboard() {
  if (typeof navigator === "undefined") return null;
  const keyboard = (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;
  if (!keyboard || typeof keyboard.lock !== "function" || typeof keyboard.unlock !== "function") return null;
  return keyboard;
}
