/**
 * Cevap kutusu. React'in ömründen bağımsızdır; localStorage'da durur.
 * "Kaydedildi" yalnız sunucu WRITTEN veya DUPLICATE dediğinde gelir.
 * Uçuştaki istek, kuyruğa sonradan giren sürümü silmez.
 */

export type OutboxPhase = "pending" | "sending" | "confirmed" | "failed";

export type OutboxRecord = {
  itemId: string;
  answer: Record<string, unknown>;
  mediaId: string | null;
  intentId: string | null;
  localVersion: number;
  state: OutboxPhase;
  seq?: number;
  error?: string;
  tries: number;
  hidden: boolean;
};

export type OutboxStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

export type AnswerSendStatus = "WRITTEN" | "DUPLICATE" | "STALE" | "REJECTED";

export type AnswerSendResult = {
  status: AnswerSendStatus;
  serverSeq: number;
};

export type TransportFailure = {
  status: number;
  code?: string;
  message: string;
};

export type OutgoingAnswer = {
  itemId: string;
  answer: Record<string, unknown>;
  mediaId: string | null;
  intentId: string | null;
  seq: number;
  localVersion: number;
};

type ServerRow = { itemId: string; answer: Record<string, unknown>; seq: number };

type Persisted = {
  records: OutboxRecord[];
  nextVersion: number;
  nextSeq: number;
  server: ServerRow[];
};

const EMPTY: readonly OutboxRecord[] = [];
const LOCK_TRIES = 6;

export function sameAnswer(left: unknown, right: unknown): boolean {
  return stable(left) === stable(right);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export class AnswerOutbox {
  private records = new Map<string, OutboxRecord>();
  private server = new Map<string, ServerRow>();
  private nextVersion = 0;
  private nextSeq = 0;
  private hydrated = false;
  private paused = false;
  private inflight: { itemId: string; localVersion: number; seq: number } | null = null;
  private revision = 0;
  private published: readonly OutboxRecord[] = EMPTY;
  private listeners = new Set<() => void>();
  private pumps = new Set<() => void>();
  private waiters: { itemId: string; version: number; resolve: () => void; reject: (err: Error) => void }[] = [];
  private idleWaiters: (() => void)[] = [];

  constructor(
    readonly applicationId: string,
    private storage: OutboxStorage,
  ) {
    this.restore();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onPump(listener: () => void) {
    this.pumps.add(listener);
    return () => this.pumps.delete(listener);
  }

  getSnapshot(): readonly OutboxRecord[] {
    return this.published;
  }

  revisionOf() {
    return this.revision;
  }

  isHydrated() {
    return this.hydrated;
  }

  isPaused() {
    return this.paused;
  }

  /** Ekranda gösterilecek cevap. "Start again" sonrası undefined; sunucu satırı durur. */
  getAnswer(itemId: string): Record<string, unknown> | undefined {
    const record = this.records.get(itemId);
    if (!record || record.hidden) return undefined;
    return record.answer;
  }

  put(itemId: string, answer: Record<string, unknown>, mediaId?: string | null, intentId?: string | null): number {
    const localVersion = ++this.nextVersion;
    const previous = this.records.get(itemId);
    this.records.set(itemId, {
      itemId,
      answer,
      mediaId: mediaId ?? null,
      intentId: intentId ?? null,
      localVersion,
      state: "pending",
      tries: previous?.state === "failed" ? previous.tries : 0,
      hidden: false,
    });
    this.persist();
    this.wake();
    return localVersion;
  }

  discard(itemId: string) {
    const saved = this.server.get(itemId);
    if (this.inflight?.itemId === itemId) this.inflight = null;
    if (saved) {
      this.records.set(itemId, {
        itemId,
        answer: saved.answer,
        mediaId: mediaIdOf(saved.answer),
        intentId: null,
        localVersion: ++this.nextVersion,
        state: "confirmed",
        seq: saved.seq,
        tries: 0,
        hidden: true,
      });
    } else {
      this.records.delete(itemId);
    }
    this.settle(itemId, Number.MAX_SAFE_INTEGER, null);
    this.persist();
    this.wake();
  }

  /** Sunucu listesi gelmeden gönderim yok. Seq, sunucudaki en büyük değerin üstünden devam eder. */
  hydrate(remote: ServerRow[]) {
    this.server = new Map(remote.map((row) => [row.itemId, row]));
    this.nextSeq = Math.max(this.nextSeq, 0, ...remote.map((row) => row.seq), ...[...this.records.values()].map((row) => row.seq ?? 0));
    for (const row of remote) {
      const local = this.records.get(row.itemId);
      if (!local) {
        this.records.set(row.itemId, {
          itemId: row.itemId,
          answer: row.answer,
          mediaId: mediaIdOf(row.answer),
          intentId: null,
          localVersion: ++this.nextVersion,
          state: "confirmed",
          seq: row.seq,
          tries: 0,
          hidden: false,
        });
        continue;
      }
      const same = sameAnswer(local.answer, row.answer);
      if (same && local.state !== "pending" && local.state !== "sending") {
        local.state = "confirmed";
        local.seq = row.seq;
        local.error = undefined;
      } else if (same && (local.state === "pending" || local.state === "sending")) {
        local.state = "confirmed";
        local.seq = row.seq;
        local.error = undefined;
        if (this.inflight?.itemId === row.itemId && this.inflight.localVersion === local.localVersion) this.inflight = null;
        this.settle(row.itemId, local.localVersion, null);
      } else if (local.state === "confirmed") {
        local.state = "pending";
      }
    }
    this.hydrated = true;
    this.persist();
    this.wake();
  }

  /** Gönderilecek bir sonraki sürüm. Hidrasyon bitmeden ve duraklamada null. */
  nextSend(): OutgoingAnswer | null {
    if (!this.hydrated || this.paused || this.inflight) return null;
    const next = [...this.records.values()].find((record) => record.state === "pending" && !record.hidden);
    if (!next) return null;
    if (next.seq == null) next.seq = ++this.nextSeq;
    next.state = "sending";
    this.inflight = { itemId: next.itemId, localVersion: next.localVersion, seq: next.seq };
    this.persist();
    this.publish();
    return toOutgoing(next);
  }

  applyResult(itemId: string, localVersion: number, result: AnswerSendResult) {
    if (this.inflight?.itemId === itemId && this.inflight.localVersion === localVersion) this.inflight = null;
    this.nextSeq = Math.max(this.nextSeq, result.serverSeq);
    const current = this.records.get(itemId);
    if (result.status === "WRITTEN" || result.status === "DUPLICATE") {
      if (current && current.localVersion === localVersion) {
        current.state = "confirmed";
        current.error = undefined;
        current.tries = 0;
        this.server.set(itemId, { itemId, answer: current.answer, seq: result.serverSeq });
        this.settle(itemId, localVersion, null);
      } else {
        this.settleExact(itemId, localVersion, null);
      }
    } else if (result.status === "STALE") {
      if (current && current.localVersion === localVersion) {
        current.seq = result.serverSeq + 1;
        current.state = "pending";
        this.nextSeq = Math.max(this.nextSeq, current.seq);
      } else if (current && current.localVersion > localVersion && (current.seq == null || current.seq <= result.serverSeq)) {
        current.seq = result.serverSeq + 1;
        if (current.state === "sending") current.state = "pending";
        this.nextSeq = Math.max(this.nextSeq, current.seq);
      }
    } else if (current && current.localVersion === localVersion) {
      current.state = "failed";
      current.error = result.status;
      this.settle(itemId, localVersion, new Error("This answer was not saved."));
    }
    this.persist();
    this.wake();
  }

  applyTransportError(itemId: string, localVersion: number, failure: TransportFailure) {
    if (failure.code === "SESSION_REPLACED") {
      this.pause();
      return;
    }
    if (this.inflight?.itemId === itemId && this.inflight.localVersion === localVersion) this.inflight = null;
    const current = this.records.get(itemId);
    if (!current || current.localVersion !== localVersion) {
      this.persist();
      this.wake();
      return;
    }
    current.tries += 1;
    current.error = failure.message;
    const fatal = failure.status >= 400 && failure.status < 500 && failure.status !== 401 && failure.status !== 409 && failure.status !== 408 && failure.status !== 429;
    const lockedOut = failure.code === "ANSWER_LOCKED" && current.tries >= LOCK_TRIES;
    if (fatal || lockedOut) {
      current.state = "failed";
      this.settle(itemId, localVersion, new Error(failure.message || "This answer was not saved."));
    } else {
      current.state = "pending";
    }
    this.persist();
    this.wake();
  }

  pause() {
    this.paused = true;
    if (this.inflight) {
      const current = this.records.get(this.inflight.itemId);
      if (current && current.localVersion === this.inflight.localVersion && current.state === "sending") {
        current.state = "pending";
      }
      this.inflight = null;
    }
    this.persist();
    this.publish();
  }

  resume() {
    this.paused = false;
    this.wake();
  }

  /** Kapanış isteğine girecek, henüz onaylanmamış cevaplar. Seq burada sabitlenir. */
  snapshot(): OutgoingAnswer[] {
    const pending = [...this.records.values()].filter((record) => record.state !== "confirmed" && !record.hidden);
    for (const record of pending) {
      if (record.seq == null) record.seq = ++this.nextSeq;
    }
    if (pending.length) this.persist();
    return pending.map(toOutgoing);
  }

  confirmSnapshot(sent: OutgoingAnswer[]) {
    for (const item of sent) {
      const current = this.records.get(item.itemId);
      if (!current || current.localVersion !== item.localVersion) continue;
      current.state = "confirmed";
      current.error = undefined;
      this.server.set(item.itemId, { itemId: item.itemId, answer: current.answer, seq: item.seq });
      this.settle(item.itemId, item.localVersion, null);
    }
    this.persist();
    this.publish();
    this.resolveIdle();
  }

  whenSettled(itemId: string, version: number): Promise<void> {
    const current = this.records.get(itemId);
    if (current && current.state === "confirmed" && current.localVersion >= version) return Promise.resolve();
    if (current && current.state === "failed" && current.localVersion === version) {
      return Promise.reject(new Error(current.error || "This answer was not saved."));
    }
    return new Promise((resolve, reject) => {
      this.waiters.push({ itemId, version, resolve, reject });
    });
  }

  whenIdle(): Promise<void> {
    if (!this.hasWork()) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  hasWork() {
    if (this.inflight) return true;
    return [...this.records.values()].some((record) => record.state === "pending" || record.state === "sending");
  }

  nudge() {
    this.wake();
  }

  private settle(itemId: string, version: number, err: Error | null) {
    const left = [];
    for (const waiter of this.waiters) {
      if (waiter.itemId !== itemId || waiter.version > version) {
        left.push(waiter);
        continue;
      }
      if (err) waiter.reject(err);
      else waiter.resolve();
    }
    this.waiters = left;
  }

  private settleExact(itemId: string, version: number, err: Error | null) {
    const left = [];
    for (const waiter of this.waiters) {
      if (waiter.itemId !== itemId || waiter.version !== version) {
        left.push(waiter);
        continue;
      }
      if (err) waiter.reject(err);
      else waiter.resolve();
    }
    this.waiters = left;
  }

  private restore() {
    const raw = this.storage.get(storageKey(this.applicationId));
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Persisted;
      this.nextVersion = saved.nextVersion ?? 0;
      this.nextSeq = saved.nextSeq ?? 0;
      for (const row of saved.server ?? []) this.server.set(row.itemId, row);
      for (const record of saved.records ?? []) {
        if (record.state === "sending") record.state = "pending";
        this.records.set(record.itemId, record);
      }
      this.publish();
    } catch {
      this.storage.set(storageKey(this.applicationId), "");
    }
  }

  private persist() {
    const body: Persisted = {
      records: [...this.records.values()],
      nextVersion: this.nextVersion,
      nextSeq: this.nextSeq,
      server: [...this.server.values()],
    };
    try {
      this.storage.set(storageKey(this.applicationId), JSON.stringify(body));
    } catch {
      // Depo doluysa bellek kuyruğu gönderime devam eder.
    }
    this.publish();
  }

  private publish() {
    this.published = [...this.records.values()];
    this.revision += 1;
    for (const listener of this.listeners) listener();
    this.resolveIdle();
  }

  private wake() {
    this.publish();
    for (const pump of this.pumps) pump();
  }

  private resolveIdle() {
    if (this.hasWork()) return;
    const waiting = this.idleWaiters;
    this.idleWaiters = [];
    for (const resolve of waiting) resolve();
  }
}

function toOutgoing(record: OutboxRecord): OutgoingAnswer {
  return {
    itemId: record.itemId,
    answer: record.answer,
    mediaId: record.mediaId,
    intentId: record.intentId,
    seq: record.seq ?? 0,
    localVersion: record.localVersion,
  };
}

function mediaIdOf(answer: Record<string, unknown>): string | null {
  if (typeof answer.mediaId === "string" && answer.mediaId) return answer.mediaId;
  const many = answer.mediaIds;
  if (Array.isArray(many) && typeof many[0] === "string") return many[0];
  return null;
}

function storageKey(applicationId: string) {
  return `ilc-answer-outbox:${applicationId}`;
}

const boxes = new Map<string, AnswerOutbox>();

export function memoryStorage(): OutboxStorage {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      data.set(key, value);
    },
  };
}

export function browserStorage(): OutboxStorage {
  return {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      localStorage.setItem(key, value);
    },
  };
}

export function getAnswerOutbox(applicationId: string): AnswerOutbox {
  let box = boxes.get(applicationId);
  if (!box) {
    box = new AnswerOutbox(applicationId, browserStorage());
    boxes.set(applicationId, box);
  }
  return box;
}

/** Testler kutuyu paylaşmasın. */
export function dropAnswerOutbox(applicationId: string) {
  boxes.delete(applicationId);
}
