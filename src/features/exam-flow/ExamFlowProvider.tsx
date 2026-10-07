"use client";

import { ExamApiError, getState, heartbeat, previewAssignment, startAttempt } from "@/src/features/exam-flow/api";
import { clearQueued, enqueueEvent, flushEventsKeepalive, readQueue } from "@/src/features/exam-flow/eventQueue";
import { FullscreenGate } from "@/src/features/exam-flow/FullscreenGate";
import {
  clearExpectedExit,
  enterExamFullscreen,
  exitExamFullscreen,
  expectedExitRemainingMs,
  holdExamMedia,
  isExamFullscreen,
  isFullscreenExitExpected,
  lockExamEscape,
  releaseExamMediaHold,
} from "@/src/features/exam-flow/fullscreen";
import type { ExamState } from "@/src/features/exam-flow/schema";
import { clearSession, readSession, stageHref, writeSession } from "@/src/features/exam-flow/session";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type FlowContextValue = {
  recipientId: string;
  state: ExamState | null;
  loading: boolean;
  error: string | null;
  conflict: boolean;
  held: boolean;
  /** Get Ready sonrası tam ekrandan çıkıldı. Sayaç da bu yüzden durur. */
  fullscreenBlocked: boolean;
  reload: () => void;
  applyState: (next: ExamState) => void;
  /** Tıklamanın içinde tam ekran ister. Söz verilmeden önce çağrılmalı. */
  engageFullscreen: () => Promise<void>;
  takeOver: () => Promise<void>;
  /** Biten denemeden çık, yeni deneme için hoş geldin ekranına dön (giriş hakkı varsa). */
  startOver: () => void;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function useExamFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("Exam flow is not ready");
  return value;
}

export function ExamFlowProvider({ recipientId, children }: { recipientId: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<ExamState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [held, setHeld] = useState(false);
  const stateRef = useRef<ExamState | null>(null);
  const heldRef = useRef(false);
  const linkDownRef = useRef(false);
  const seenFocusLoss = useRef<number | null>(null);
  const [focusWarning, setFocusWarning] = useState<number | null>(null);
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const fullscreenBlockedRef = useRef(false);
  // Beklenen çıkış (izin penceresi / dosya seçici): sınav durmaz, ihlal yazılmaz; sonraki dokunuşta tam ekrana döner.
  const [softExit, setSoftExit] = useState(false);
  const enterPromiseRef = useRef<Promise<void> | null>(null);
  const lastNav = useRef<{ to: string; at: number; count: number }>({ to: "", at: 0, count: 0 });
  const needsFullscreen = state != null && state.stage !== "WELCOME" && state.stage !== "FINISHED";
  const shouldBlockFullscreen = needsFullscreen && !isExamFullscreen() && !softExit;
  if (fullscreenBlocked !== shouldBlockFullscreen) {
    setFullscreenBlocked(shouldBlockFullscreen);
  }

  /**
   * Aşamaya uygun adrese tek seferlik yönlendirme. Her router.replace sunucuya bir istek demek; bu yüzden:
   * - adres çubuğundaki gerçek yol zaten hedefse hiçbir şey yapma (usePathname bir an geride kalabilir),
   * - aynı hedefe 1 sn içinde tekrar gitme; art arda denemeler olursa geliştirmede konsola yaz.
   */
  const navigateOnce = useCallback(
    (to: string, reason: string) => {
      if (currentPath() === to) return;
      const now = Date.now();
      const last = lastNav.current;
      if (last.to === to && now - last.at < 1000) {
        last.count += 1;
        if (last.count >= 3 && process.env.NODE_ENV !== "production") {
          console.warn("[exam-flow] yönlendirme döngüsü engellendi", { to, reason, path: window.location.pathname });
        }
        return;
      }
      lastNav.current = { to, at: now, count: 1 };
      router.replace(to);
    },
    [router],
  );

  const applyState = useCallback((next: ExamState) => {
    stateRef.current = next;
    setState(next);
    setConflict(false);
    setError(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let session = readSession(recipientId);
      let next: ExamState;
      if (!session) {
        const started = await startAttempt(recipientId, { intent: "RESUME", fingerprint: navigator.userAgent });
        session = { applicationId: started.applicationId, sessionToken: started.sessionToken };
        writeSession(recipientId, session);
        next = started.state;
      } else {
        next = await getState(session.applicationId, session.sessionToken);
      }
      // Biten deneme + kalan giriş hakkı: bitti ekranına değil, yeni deneme için hoş geldin ekranına.
      if (next.stage === "FINISHED" && (await hasAttemptsLeft(recipientId))) {
        clearSession(recipientId);
        stateRef.current = null;
        setState(null);
        return;
      }
      applyState(next);
    } catch (err) {
      const flow = err instanceof ExamApiError ? err : null;
      if (flow?.code === "NO_ATTEMPTS" || flow?.status === 404) {
        setState(null);
        stateRef.current = null;
        return;
      }
      if (flow?.code === "SESSION_REPLACED" || flow?.status === 409 && flow.code === "SESSION_REPLACED") {
        setConflict(true);
        if (flow.state) applyState(flow.state);
        return;
      }
      if (flow?.state) {
        applyState(flow.state);
        return;
      }
      setError(flow?.message || "We could not load your test. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [applyState, recipientId]);

  useEffect(() => {
    // İlk yükleme bir mikro görevde (effect içinde senkron setState olmasın).
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    if (loading || conflict) return;
    const target = state
      ? stageHref(recipientId, state.stage, state.currentSectionId)
      : `/student/exams/${recipientId}`;
    if (pathname.replace(/\/$/, "") === target.replace(/\/$/, "")) return;
    navigateOnce(target.replace(/\/$/, ""), "stage");
  }, [conflict, loading, navigateOnce, pathname, recipientId, state]);

  useEffect(() => {
    const onPop = () => {
      const current = stateRef.current;
      if (!current) return;
      const target = stageHref(recipientId, current.stage, current.currentSectionId);
      if (currentPath() !== target) {
        const session = readSession(recipientId);
        if (session) enqueueEvent(session.applicationId, "NAV_BLOCKED", { path: window.location.pathname });
        navigateOnce(target, "back-button");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [navigateOnce, recipientId]);

  useEffect(() => {
    const session = readSession(recipientId);
    if (!session || state?.stage !== "IN_SECTION") return;
    const syncHeld = () => {
      const paused = document.hidden || !navigator.onLine || linkDownRef.current;
      heldRef.current = paused;
      setHeld(paused);
    };
    const mark = (type: string) => {
      enqueueEvent(session.applicationId, type);
      syncHeld();
      if (document.hidden) flushEventsKeepalive(session.applicationId, session.sessionToken);
    };
    const onHide = () => {
      if (!navigator.onLine) {
        syncHeld();
        return;
      }
      mark(document.hidden ? "VISIBILITY_HIDDEN" : "VISIBILITY_VISIBLE");
    };
    const onOff = () => mark("CONNECTION_LOST");
    const onOn = () => mark("CONNECTION_RESTORED");
    const onPageHide = () => flushEventsKeepalive(session.applicationId, session.sessionToken);
    syncHeld();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    window.addEventListener("pagehide", onPageHide);
    enqueueEvent(session.applicationId, "PAGE_LOAD");
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [recipientId, state?.stage, state?.applicationId]);

  useEffect(() => {
    const count = state?.proctoring.focusLossCount ?? 0;
    if (seenFocusLoss.current == null) {
      seenFocusLoss.current = count;
      return;
    }
    if (state?.stage === "IN_SECTION" && count > seenFocusLoss.current) {
      setFocusWarning(Math.max(0, state.proctoring.focusLossLimit - count));
    }
    seenFocusLoss.current = count;
  }, [state]);

  useEffect(() => {
    const rules = state?.proctoring;
    if (!rules || state.stage === "FINISHED" || state.stage === "WELCOME") return;
    const stop = (event: Event) => event.preventDefault();
    if (rules.blockCopyPaste) {
      document.addEventListener("copy", stop);
      document.addEventListener("cut", stop);
      document.addEventListener("paste", stop);
    }
    if (rules.blockContextMenu) document.addEventListener("contextmenu", stop);
    return () => {
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("paste", stop);
      document.removeEventListener("contextmenu", stop);
    };
  }, [state?.proctoring, state?.stage]);

  const engageFullscreen = useCallback(() => {
    const pending = enterExamFullscreen().then(() => {
      const blocked = !isExamFullscreen();
      fullscreenBlockedRef.current = blocked;
      setFullscreenBlocked(blocked);
      if (!blocked) {
        releaseExamMediaHold();
        void lockExamEscape();
      }
    });
    enterPromiseRef.current = pending;
    void pending.finally(() => {
      if (enterPromiseRef.current === pending) enterPromiseRef.current = null;
    });
    return pending;
  }, []);

  useEffect(() => {
    fullscreenBlockedRef.current = shouldBlockFullscreen;
  }, [shouldBlockFullscreen]);

  useEffect(() => {
    if (!needsFullscreen) return;
    const wasOn = { current: isExamFullscreen() };
    if (wasOn.current) void lockExamEscape();
    else holdExamMedia();
    const onChange = () => {
      const on = isExamFullscreen();
      if (wasOn.current && !on && isFullscreenExitExpected()) {
        // Öğrencinin başlattığı izin/dosya işlemi tarayıcıyı tam ekrandan çıkardı: ihlal değil.
        wasOn.current = false;
        fullscreenBlockedRef.current = false;
        setSoftExit(true);
        return;
      }
      if (on) {
        clearExpectedExit();
        setSoftExit(false);
      }
      if (wasOn.current && !on) {
        const session = readSession(recipientId);
        if (session) {
          enqueueEvent(session.applicationId, "FULLSCREEN_EXIT");
          flushEventsKeepalive(session.applicationId, session.sessionToken);
        }
      }
      wasOn.current = on;
      fullscreenBlockedRef.current = !on;
      setFullscreenBlocked(!on);
      if (on) {
        releaseExamMediaHold();
        void lockExamEscape();
      } else {
        holdExamMedia();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [needsFullscreen, recipientId, state?.applicationId]);

  // Yumuşak mod: öğrencinin sonraki dokunuşu/tuşu tam ekranı geri açar (tarayıcı tam ekranı yalnız kullanıcı hareketiyle açar).
  // Pencere içinde dönülmezse eski kural: çıkış ihlal olarak yazılır ve sınav durur (kapı).
  useEffect(() => {
    if (!softExit || !needsFullscreen) return;
    const resume = () => {
      if (!isExamFullscreen()) void engageFullscreen().catch(() => undefined);
    };
    document.addEventListener("click", resume, true);
    document.addEventListener("keydown", resume, true);
    let timer = 0;
    const expire = () => {
      if (isExamFullscreen()) return;
      // Yumuşak modda yeni bir izin/dosya işlemi pencereyi uzattıysa bekle (kapı erken açılmasın).
      if (isFullscreenExitExpected()) {
        timer = window.setTimeout(expire, expectedExitRemainingMs() + 50);
        return;
      }
      const session = readSession(recipientId);
      if (session) {
        enqueueEvent(session.applicationId, "FULLSCREEN_EXIT");
        flushEventsKeepalive(session.applicationId, session.sessionToken);
      }
      clearExpectedExit();
      holdExamMedia();
      setSoftExit(false);
    };
    timer = window.setTimeout(expire, expectedExitRemainingMs() + 50);
    return () => {
      document.removeEventListener("click", resume, true);
      document.removeEventListener("keydown", resume, true);
      window.clearTimeout(timer);
    };
  }, [softExit, needsFullscreen, engageFullscreen, recipientId]);

  useEffect(() => {
    if (needsFullscreen || enterPromiseRef.current) return;
    releaseExamMediaHold();
    if (isExamFullscreen()) void exitExamFullscreen();
  }, [needsFullscreen]);

  useEffect(() => {
    return () => {
      void exitExamFullscreen();
    };
  }, []);

  useEffect(() => {
    if (!state || state.stage !== "IN_SECTION") return;
    const session = readSession(recipientId);
    if (!session) return;
    let stopped = false;
    let timer = 0;
    let failureDelay = 1000;
    const schedule = (ms: number) => {
      timer = window.setTimeout(() => void tick(), ms);
    };
    const tick = async () => {
      if (stopped) return;
      if (document.hidden || !navigator.onLine || fullscreenBlockedRef.current) {
        schedule(1000);
        return;
      }
      const events = readQueue(session.applicationId);
      try {
        const next = await heartbeat(session.applicationId, session.sessionToken, events);
        clearQueued(session.applicationId, events.map((event) => event.clientEventId));
        linkDownRef.current = false;
        failureDelay = 1000;
        heldRef.current = document.hidden || !navigator.onLine;
        setHeld(heldRef.current);
        applyState(next);
        if (!stopped) schedule(5000);
      } catch (err) {
        const flow = err instanceof ExamApiError ? err : null;
        if (flow?.code === "SESSION_REPLACED") {
          setConflict(true);
          return;
        }
        if (flow?.state) applyState(flow.state);
        linkDownRef.current = true;
        heldRef.current = true;
        setHeld(true);
        const wait = failureDelay;
        failureDelay = failureDelay === 1000 ? 2000 : 5000;
        if (!stopped) schedule(wait);
      }
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [applyState, recipientId, state?.applicationId, state?.stage]);

  const takeOver = useCallback(async () => {
    const started = await startAttempt(recipientId, { intent: "RESUME", fingerprint: navigator.userAgent });
    writeSession(recipientId, { applicationId: started.applicationId, sessionToken: started.sessionToken });
    applyState(started.state);
    setConflict(false);
  }, [applyState, recipientId]);

  const startOver = useCallback(() => {
    clearSession(recipientId);
    stateRef.current = null;
    setState(null);
  }, [recipientId]);

  const value = useMemo<FlowContextValue>(
    () => ({
      recipientId,
      state,
      loading,
      error,
      conflict,
      held,
      fullscreenBlocked,
      reload: () => void load(),
      applyState,
      engageFullscreen,
      takeOver,
      startOver,
    }),
    [applyState, conflict, engageFullscreen, error, fullscreenBlocked, held, load, loading, recipientId, startOver, state, takeOver],
  );

  return (
    <FlowContext.Provider value={value}>
      <div className={fullscreenBlocked ? "invisible flex min-h-0 flex-1 flex-col" : "contents"} aria-hidden={fullscreenBlocked || undefined}>
        {children}
      </div>
      {fullscreenBlocked ? <FullscreenGate onResume={engageFullscreen} /> : null}
      {softExit && needsFullscreen && !fullscreenBlocked ? (
        // Sınavı kapatmayan küçük şerit: herhangi bir dokunuş tam ekranı geri açar.
        <button
          type="button"
          onClick={() => void engageFullscreen().catch(() => undefined)}
          className="fixed inset-x-0 top-2 z-40 mx-auto flex w-max max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          Tap anywhere to go back to full screen
        </button>
      ) : null}
      {focusWarning != null && !fullscreenBlocked ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div role="alertdialog" aria-labelledby="focus-warning-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <h2 id="focus-warning-title" className="text-lg font-semibold text-ilc-navy">You left the test screen</h2>
            <p className="mt-2 text-sm text-ilc-navy/80">Please stay on the test screen. Chances left: {focusWarning}.</p>
            <button type="button" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-ilc-navy px-4 text-sm font-medium text-white" onClick={() => setFocusWarning(null)}>
              Back to the test
            </button>
          </div>
        </div>
      ) : null}
    </FlowContext.Provider>
  );
}

export function useExamClock(held: boolean, clock: ExamState["clock"] | null) {
  const anchor = useRef<{ remaining: number | null; at: number; running: boolean }>({
    remaining: null,
    at: 0,
    running: false,
  });
  const remaining = clock?.sectionRemainingMs ?? clock?.examRemainingMs ?? null;
  const [left, setLeft] = useState<number | null>(remaining);
  // Sunucudan yeni saat gelince gösterilen değeri render sırasında eşitle (effect + setState yerine).
  const [seen, setSeen] = useState({ clock, held });
  if (seen.clock !== clock || seen.held !== held) {
    setSeen({ clock, held });
    setLeft(remaining);
  }

  useEffect(() => {
    anchor.current = {
      remaining,
      at: performance.now(),
      running: Boolean(clock?.running) && !held,
    };
  }, [clock, held, remaining]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = anchor.current;
      if (current.remaining == null) {
        setLeft(null);
        return;
      }
      if (!current.running) {
        setLeft(current.remaining);
        return;
      }
      setLeft(Math.max(0, current.remaining - (performance.now() - current.at)));
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  return left;
}

/** Adres çubuğundaki yol (sondaki / olmadan). */
/** Ödevde kullanılmamış giriş hakkı var mı (bilgi alınamazsa false: mevcut davranış korunur). */
async function hasAttemptsLeft(recipientId: string) {
  try {
    return (await previewAssignment(recipientId)).assignment.attemptsLeft > 0;
  } catch {
    return false;
  }
}

function currentPath() {
  return typeof window === "undefined" ? "" : window.location.pathname.replace(/\/$/, "");
}
