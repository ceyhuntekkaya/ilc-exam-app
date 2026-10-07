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

/** İzin isteyen işlemi (getUserMedia) beklenen çıkış penceresi içinde çalıştırır. */
export async function withExpectedExit<T>(work: () => Promise<T>): Promise<T> {
  expectFullscreenExit();
  try {
    return await work();
  } finally {
    settleExpectedExit();
  }
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
  const doc = document as WebkitDocument;
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

export function canRequestFullscreen() {
  if (typeof document === "undefined") return false;
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
