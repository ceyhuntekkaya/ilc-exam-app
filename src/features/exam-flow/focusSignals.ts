"use client";

/**
 * Sınav ekranından ayrılma sinyalleri (full-screen/focus-guard çalışmasından uyarlandı).
 * Hiçbiri sınavı durdurmaz, ekranı kapatmaz ya da kapı açmaz: olaylar kuyruğa yazılır, heartbeat ile sunucuya gider.
 * Sayım (hak düşmesi / otomatik teslim) sunucudadır: yalnız FOCUS_LOST ve VISIBILITY_HIDDEN sayılır.
 *
 * - FOCUS_LOST: sayfa görünürken odak başka yerde (Alt+Tab ile yan pencere, ikinci ekran, iPad Slide Over,
 *   ayrı pencere geliştirici araçları). macOS/iPadOS'ta blur bazen gelmez; document.hasFocus() yoklaması yakalar.
 * - SPLIT_SCREEN: genişlik belirgin daraldı (iPad Split View / Stage Manager, yan yana pencere). Yalnız kayıt.
 * - PICTURE_IN_PICTURE, BLOCKED_SHORTCUT, PRINT_ATTEMPT, MULTI_SCREEN: yalnız kayıt.
 * - Wake Lock: tablet ekranı kendiliğinden kararıp sayfa gizlenmesin (yoksa odak kaybı sayılırdı).
 */

import { enqueueEvent } from "@/src/features/exam-flow/eventQueue";
import { isExamFullscreen, isFullscreenExitExpected } from "@/src/features/exam-flow/fullscreen";
import { useEffect } from "react";

/** Kısa odak kayıpları (sistem bildirimi, izin baloncuğu, dokunma sırasında anlık blur) sayılmaz. */
const FOCUS_SUSTAIN_MS = 1500;
const POLL_MS = 500;
/** Bu oranın üzerindeki genişlik daralması bölünmüş ekran sayılır. Yükseklik bakılmaz: ekran klavyesi daraltır. */
const WIDTH_SHRINK = 0.15;

const BLOCKED_KEYS = new Set(["KeyP", "KeyS", "KeyU", "KeyF"]);
const DEVTOOLS_KEYS = new Set(["KeyI", "KeyJ", "KeyC"]);

let focusLossOpen = false;

/** Sayfa gizlenmeden önce odak zaten kaybedilmiş ve sayılmış mı (aynı çıkış ikinci kez sayılmasın). */
export function isFocusLossOpen() {
  return focusLossOpen;
}

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> };
type WakeLockApi = { request: (type: "screen") => Promise<WakeLockSentinelLike> };

type Options = {
  applicationId: string | null;
  /** Soru ekranı (IN_SECTION): odak / bölünmüş ekran izlenir. */
  inSection: boolean;
  /** Hoş geldin ve bitiş dışındaki tüm aşamalar: ekran uyanık tutulur, kısayollar kilitlenir. */
  active: boolean;
  blockShortcuts: boolean;
};

export function useExamFocusSignals({ applicationId, inSection, active, blockShortcuts }: Options) {
  useEffect(() => {
    if (!applicationId || !inSection) return;
    const log = (type: string, payload: Record<string, unknown> = {}) => enqueueEvent(applicationId, type, payload);

    let blurredAt: number | null = null;
    let lostAt: number | null = null;
    let baseline: number | null = null;
    let split = false;
    let baselineTimer = 0;
    let checkTimer = 0;

    const captureBaseline = (delay: number) => {
      baseline = null;
      window.clearTimeout(baselineTimer);
      baselineTimer = window.setTimeout(() => {
        if (document.hidden || !document.hasFocus()) return;
        baseline = window.innerWidth;
        split = false;
      }, delay);
    };

    const check = () => {
      const now = Date.now();
      const focused = document.hasFocus();
      if (!document.hidden && !focused && !isFullscreenExitExpected()) {
        blurredAt ??= now;
        if (lostAt == null && now - blurredAt >= FOCUS_SUSTAIN_MS) {
          lostAt = blurredAt;
          focusLossOpen = true;
          log("FOCUS_LOST", { fullscreen: isExamFullscreen() });
        }
      } else {
        // Gizlenme visibilitychange ile kaydedilir; burada yalnız dönüş kapatılır.
        blurredAt = null;
        if (!document.hidden && focused && lostAt != null) {
          log("FOCUS_RESTORED", { awayMs: now - lostAt });
          lostAt = null;
          focusLossOpen = false;
        }
      }

      if (baseline != null && !document.hidden) {
        const width = window.innerWidth;
        if (width > baseline) baseline = width;
        const shrunk = 1 - width / baseline > WIDTH_SHRINK;
        if (shrunk && !split) {
          split = true;
          log("SPLIT_SCREEN", { width, baseline });
        } else if (!shrunk) {
          split = false;
        }
      }
    };

    const checkSoon = (delay: number) => {
      window.clearTimeout(checkTimer);
      checkTimer = window.setTimeout(check, delay);
    };
    const onBlur = () => checkSoon(FOCUS_SUSTAIN_MS + 50);
    const onFocus = () => check();
    const onResize = () => checkSoon(250);
    // Yön değişimi ve tam ekrana giriş/çıkış genişliği meşru biçimde değiştirir: taban yeniden alınır.
    const onOrientation = () => captureBaseline(800);
    const onFullscreen = () => captureBaseline(600);
    const onPip = () => log("PICTURE_IN_PICTURE");

    const extended = (screen as Screen & { isExtended?: boolean }).isExtended === true;
    const multiKey = `ilc-multiscreen:${applicationId}`;
    if (extended && !sessionStorage.getItem(multiKey)) {
      sessionStorage.setItem(multiKey, "1");
      log("MULTI_SCREEN");
    }

    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onOrientation);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("webkitfullscreenchange", onFullscreen);
    document.addEventListener("enterpictureinpicture", onPip, true);
    const poll = window.setInterval(check, POLL_MS);
    captureBaseline(450);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(baselineTimer);
      window.clearTimeout(checkTimer);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onOrientation);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("webkitfullscreenchange", onFullscreen);
      document.removeEventListener("enterpictureinpicture", onPip, true);
      focusLossOpen = false;
    };
  }, [applicationId, inSection]);

  useEffect(() => {
    if (!applicationId || !active || !blockShortcuts) return;
    const onKey = (event: KeyboardEvent) => {
      const label = blockedShortcut(event);
      if (!label) return;
      event.preventDefault();
      if (!event.repeat) enqueueEvent(applicationId, "BLOCKED_SHORTCUT", { key: label });
    };
    const onPrint = () => enqueueEvent(applicationId, "PRINT_ATTEMPT");
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("beforeprint", onPrint);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [active, applicationId, blockShortcuts]);

  useEffect(() => {
    if (!active) return;
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let stopped = false;
    const acquire = async () => {
      if (stopped || document.hidden || (sentinel && !sentinel.released)) return;
      try {
        const next = await wakeLock.request("screen");
        if (stopped) void next.release().catch(() => undefined);
        else sentinel = next;
      } catch {
        // Pil tasarrufu / http / desteklenmeyen tarayıcı: ekran normal kurallarla kararır.
      }
    };
    // Tarayıcı sayfa gizlenince kilidi bırakır; dönüşte yeniden alınır.
    const onVisible = () => {
      if (!document.hidden) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (sentinel && !sentinel.released) void sentinel.release().catch(() => undefined);
    };
  }, [active]);
}

/** Yazdır, kaydet, kaynağı göster, sayfada bul ve geliştirici araçları. Yenileme (F5 / Ctrl+R) açık kalır. */
function blockedShortcut(event: KeyboardEvent): string | null {
  if (event.code === "F12") return "F12";
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) return null;
  if ((event.shiftKey || event.altKey) && DEVTOOLS_KEYS.has(event.code)) return `DevTools (${event.code.replace("Key", "")})`;
  if (!event.shiftKey && BLOCKED_KEYS.has(event.code)) return `Ctrl/Cmd+${event.code.replace("Key", "")}`;
  return null;
}
