"use client";

import { customInstance } from "@/src/api/mutator";
import { listSavedAnswers } from "@/src/features/exam-flow/api";
import { readSession } from "@/src/features/exam-flow/session";
import {
  getAnswerOutbox,
  type AnswerSendResult,
  type OutgoingAnswer,
  type TransportFailure,
} from "@/src/features/exam-player/session/answerOutbox";

const KEEPALIVE_BUDGET = 60_000;

type WireResult = {
  status?: string;
  serverSeq?: number;
  accepted?: boolean;
  code?: string;
  itemId?: string;
};

function asStatus(row: WireResult): AnswerSendResult["status"] {
  if (row.status === "WRITTEN" || row.status === "DUPLICATE" || row.status === "STALE" || row.status === "REJECTED") {
    return row.status;
  }
  return row.accepted ? "WRITTEN" : "STALE";
}

function failureOf(err: unknown): TransportFailure {
  const error = (err ?? {}) as { status?: number; message?: string; data?: { code?: string; error?: string } };
  return {
    status: typeof error.status === "number" ? error.status : 0,
    code: error.data?.code,
    message: error.data?.error || error.message || "This answer was not saved.",
  };
}

async function putOne(applicationId: string, token: string, item: OutgoingAnswer): Promise<AnswerSendResult> {
  const response = await customInstance<{ data: WireResult }>(`/applications/${applicationId}/answers/${item.itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Token": token,
    },
    body: JSON.stringify({
      answerJson: item.answer,
      seq: item.seq,
      ...(item.mediaId ? { mediaId: item.mediaId } : {}),
      ...(item.intentId ? { intentId: item.intentId } : {}),
    }),
  });
  return { status: asStatus(response.data ?? {}), serverSeq: response.data?.serverSeq ?? item.seq };
}

function bodyOf(item: OutgoingAnswer) {
  return {
    itemId: item.itemId,
    answerJson: item.answer,
    seq: item.seq,
    ...(item.mediaId ? { mediaId: item.mediaId } : {}),
    ...(item.intentId ? { intentId: item.intentId } : {}),
  };
}

/** Sekme kapanırken bekleyen cevapları tek istekte bırakır. Sığmayanlar depoda kalır. */
export function flushAnswersKeepalive(applicationId: string, token: string) {
  const box = getAnswerOutbox(applicationId);
  const all = box.snapshot();
  if (!all.length || !token) return;
  const batch: OutgoingAnswer[] = [];
  for (const item of all) {
    const next = [...batch, item];
    if (JSON.stringify(next.map(bodyOf)).length > KEEPALIVE_BUDGET) break;
    batch.push(item);
  }
  if (!batch.length) return;
  void fetch(`/api/backend/applications/${applicationId}/answers`, {
    method: "PUT",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Session-Token": token,
    },
    body: JSON.stringify(batch.map(bodyOf)),
  }).catch(() => undefined);
}

/**
 * Kutuyu boşaltır. Ağ gecikmesi 400 ms'dir; hata olursa 1 sn, 2 sn, sonra 5 sn'de bir yeniden dener.
 * Sayfa kapanınca da çalışmaya devam eder, çünkü kutu modüldedir.
 */
export function startAnswerOutbox(applicationId: string, recipientId: string) {
  const box = getAnswerOutbox(applicationId);
  let stopped = false;
  let timer = 0;
  let delay = 400;
  let sending = false;

  const token = () => readSession(recipientId)?.sessionToken ?? "";

  async function hydrate() {
    const current = token();
    if (!current) return;
    try {
      const remote = await listSavedAnswers(applicationId, current);
      if (stopped) return;
      box.hydrate(remote.map((row) => ({ itemId: row.itemId, answer: row.answerJson, seq: row.seq })));
    } catch (err) {
      const failure = failureOf(err);
      if (failure.code === "SESSION_REPLACED") box.pause();
      else if (!stopped) window.setTimeout(() => void hydrate(), 1000);
    }
  }

  async function pump() {
    if (stopped || sending || box.isPaused()) return;
    const item = box.nextSend();
    if (!item) return;
    const current = token();
    if (!current) {
      box.applyTransportError(item.itemId, item.localVersion, { status: 0, message: "No session" });
      return;
    }
    sending = true;
    try {
      const result = await putOne(applicationId, current, item);
      if (!stopped) box.applyResult(item.itemId, item.localVersion, result);
      delay = 400;
    } catch (err) {
      const failure = failureOf(err);
      if (!stopped) box.applyTransportError(item.itemId, item.localVersion, failure);
      delay = delay >= 2000 ? 5000 : delay === 400 ? 1000 : 2000;
    } finally {
      sending = false;
    }
    if (!stopped && box.hasWork() && !box.isPaused()) schedule(box.hasWork() ? delay : 400);
  }

  function schedule(ms: number) {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void pump(), ms);
  }

  const stopPump = box.onPump(() => {
    if (!sending) schedule(delay === 400 ? 400 : delay);
  });

  const onHide = () => flushAnswersKeepalive(applicationId, token());
  const onShow = () => {
    if (document.visibilityState === "visible") {
      delay = 400;
      schedule(0);
    }
  };
  const onOnline = () => {
    delay = 400;
    box.resume();
    schedule(0);
  };

  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", onShow);
  window.addEventListener("online", onOnline);
  void hydrate();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    stopPump();
    window.removeEventListener("pagehide", onHide);
    document.removeEventListener("visibilitychange", onShow);
    window.removeEventListener("online", onOnline);
  };
}

/** Kapanış isteğinin gövdesine girecek, henüz onaylanmamış cevaplar. */
export function takeCloseBatch(applicationId: string): OutgoingAnswer[] {
  return getAnswerOutbox(applicationId).snapshot();
}

/** Kapanış isteği 200 döndüyse bu sürümler veritabanına yazılmıştır. */
export function confirmCloseBatch(applicationId: string, sent: OutgoingAnswer[]) {
  getAnswerOutbox(applicationId).confirmSnapshot(sent);
}

/** Süre dolmadan önce kuyruğu bir kez hemen dener. Bitmezse kapanış penceresi devralır. */
export function flushAnswerOutbox(applicationId: string, timeoutMs = 4000): Promise<void> {
  const box = getAnswerOutbox(applicationId);
  box.nudge();
  return Promise.race([
    box.whenIdle(),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}
