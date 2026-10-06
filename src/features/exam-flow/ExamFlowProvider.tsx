"use client";

import { ExamApiError, getState, heartbeat, startAttempt } from "@/src/features/exam-flow/api";
import { clearQueue, enqueueEvent, flushEventsKeepalive, readQueue } from "@/src/features/exam-flow/eventQueue";
import type { ExamState } from "@/src/features/exam-flow/schema";
import { readSession, stageHref, writeSession } from "@/src/features/exam-flow/session";
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
  reload: () => void;
  applyState: (next: ExamState) => void;
  takeOver: () => Promise<void>;
};

const FlowContext = createContext<FlowContextValue | null>(null);

export function useExamFlow() {
  const value = useContext(FlowContext);
  if (!value) throw new Error("Sınav akışı hazır değil");
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
  const redirectTo = useRef<string | null>(null);

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
      if (!session) {
        const started = await startAttempt(recipientId, { intent: "RESUME", fingerprint: navigator.userAgent });
        session = { applicationId: started.applicationId, sessionToken: started.sessionToken };
        writeSession(recipientId, session);
        applyState(started.state);
        return;
      }
      const next = await getState(session.applicationId, session.sessionToken);
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
      setError(flow?.message || "Sınav durumu alınamadı");
    } finally {
      setLoading(false);
    }
  }, [applyState, recipientId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || conflict) return;
    const target = state
      ? stageHref(recipientId, state.stage, state.currentSectionId)
      : `/student/exams/${recipientId}`;
    const here = pathname.replace(/\/$/, "");
    const there = target.replace(/\/$/, "");
    if (here === there) {
      redirectTo.current = null;
      return;
    }
    if (redirectTo.current === there) return;
    redirectTo.current = there;
    router.replace(there);
  }, [conflict, loading, pathname, recipientId, router, state]);

  useEffect(() => {
    const onPop = () => {
      const current = stateRef.current;
      if (!current) return;
      const target = stageHref(recipientId, current.stage, current.currentSectionId);
      if (window.location.pathname !== target) {
        const session = readSession(recipientId);
        if (session) enqueueEvent(session.applicationId, "NAV_BLOCKED", { path: window.location.pathname });
        router.replace(target);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [recipientId, router]);

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
    const onHide = () => mark(document.hidden ? "VISIBILITY_HIDDEN" : "VISIBILITY_VISIBLE");
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
      if (document.hidden || !navigator.onLine) {
        schedule(1000);
        return;
      }
      const events = readQueue(session.applicationId);
      try {
        const next = await heartbeat(session.applicationId, session.sessionToken, events);
        clearQueue(session.applicationId);
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

  const value = useMemo<FlowContextValue>(
    () => ({ recipientId, state, loading, error, conflict, held, reload: () => void load(), applyState, takeOver }),
    [applyState, conflict, error, held, load, loading, recipientId, state, takeOver],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useExamClock(held: boolean, clock: ExamState["clock"] | null) {
  const anchor = useRef<{ remaining: number | null; at: number; running: boolean }>({
    remaining: null,
    at: 0,
    running: false,
  });
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const remaining = clock?.sectionRemainingMs ?? clock?.examRemainingMs ?? null;
    anchor.current = {
      remaining,
      at: performance.now(),
      running: Boolean(clock?.running) && !held,
    };
    setLeft(remaining);
  }, [clock, held]);

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
