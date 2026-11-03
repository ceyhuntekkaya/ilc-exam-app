/**
 * Cevap kutusu. React'in ömründen bağımsızdır; IndexedDB'de durur (F3-06 — localStorage'ın
 * 5-10 MB sınırı ve senkron/ana-iş-parçacığı-bloklayan yazımı, uzun bir sınavın yanıt kuyruğu
 * için risk; `mediaOutbox.ts`'in deseni örnek alındı).
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

type PersistedMeta = { nextVersion: number; nextSeq: number; server: ServerRow[] };

/**
 * Kalıcılık soyutlaması — test edilebilirlik için enjekte edilir (`memoryPersistence()`).
 * `loadAll` ASENKRON (IndexedDB senkron API sunmaz); `saveAll` da öyle ama çağıran beklemez
 * (fire-and-forget, `mediaOutbox.ts`'teki `void idbPut(...)` örüntüsü) — depo doluysa/yazım
 * başarısız olursa bellek kuyruğu gönderime devam eder, veri yalnız BELLEKTE kalır.
 */
export type Persistence = {
  loadAll(): Promise<{ records: OutboxRecord[] } & PersistedMeta>;
  saveAll(records: OutboxRecord[], meta: PersistedMeta): void;
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
  private restored = false;
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
    private persistence: Persistence,
  ) {
    void this.restore();
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

  /** Depodan (IndexedDB, göç dahil) yüklenme bitti mi. Testler dışında beklemek GENELLİKLE gerekmez
   *  (gerçek kullanımda render + ilk etkileşim arasında zaten tamamlanır) — göç testleri bunu kullanır. */
  isRestored() {
    return this.restored;
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

  /**
   * Depodan (IndexedDB, göç dahil) yükleme ASENKRON — kurucu bunu bekleyemez (çağıranlar
   * senkron bir kutu bekliyor, bkz. `getAnswerOutbox`). Bu yüzden MERGE güvenliği şart: yükleme
   * biterken `put()` zaten yeni bir kayıt yazmışsa (dar ama gerçek bir yarış), o kayıt ASLA
   * eskiyle EZİLMEZ — yalnız o ana kadar HİÇ dokunulmamış madde kimlikleri için depodaki satır eklenir.
   *
   * `nextSend()` bu bitmeden de çalışabilir (bilinçli — `restored` ile KİLİTLENMEDİ): üretimde
   * sunucu hidrasyonu (`hydrate`, ağ) IndexedDB'den (burası) HER ZAMAN yavaştır, bu yüzden pratikte
   * `restore()` zaten biter; erken bir `nextSend()` en kötü ihtimalle henüz geri yüklenmemiş eski
   * kayıtları bir an GERİ SIRAYA atar (veri kaybı değil, yalnız gönderim sırası) — `restore()`
   * bittiğinde `wake()` zaten yeni bir pompa turu tetikler, o eski kayıtlar da gider.
   */
  private async restore() {
    const data = await this.persistence.loadAll();
    this.nextVersion = Math.max(this.nextVersion, data.nextVersion);
    this.nextSeq = Math.max(this.nextSeq, data.nextSeq);
    for (const row of data.server) {
      if (!this.server.has(row.itemId)) this.server.set(row.itemId, row);
    }
    for (const record of data.records) {
      if (this.records.has(record.itemId)) continue;
      if (record.state === "sending") record.state = "pending";
      this.records.set(record.itemId, record);
    }
    this.restored = true;
    this.publish();
    this.wake();
  }

  private persist() {
    this.persistence.saveAll([...this.records.values()], {
      nextVersion: this.nextVersion,
      nextSeq: this.nextSeq,
      server: [...this.server.values()],
    });
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

function legacyStorageKey(applicationId: string) {
  return `ilc-answer-outbox:${applicationId}`;
}

function outboxDbName(applicationId: string) {
  return `ilc-answer-outbox:${applicationId}`;
}

function openOutboxDb(applicationId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(outboxDbName(applicationId), 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) db.createObjectStore("records", { keyPath: "itemId" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbLoadAll(db: IDBDatabase): Promise<{ records: OutboxRecord[]; meta: PersistedMeta | null }> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["records", "meta"], "readonly");
    let records: OutboxRecord[] = [];
    let meta: PersistedMeta | null = null;
    const recordsReq = tx.objectStore("records").getAll();
    recordsReq.onsuccess = () => {
      records = recordsReq.result as OutboxRecord[];
    };
    const metaReq = tx.objectStore("meta").get("meta");
    metaReq.onsuccess = () => {
      meta = (metaReq.result as PersistedMeta | undefined) ?? null;
    };
    tx.oncomplete = () => resolve({ records, meta });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * F3-06/Adım 2: localStorage'daki ESKİ kuyruk (sürüm güncellemesinden önce birikmiş) IndexedDB'ye
 * bir kez taşınır. Göç TAMAMLANMADAN (tx.oncomplete) eski anahtar SİLİNMEZ — yazım yarıda kalırsa
 * (sayfa kapanır, tarayıcı çöker) veri hâlâ localStorage'da durur, bir sonraki açılışta TEKRAR denenir.
 * Bozuk/okunamayan JSON göç edilecek bir şey saymaz (zaten kullanılamaz veriydi).
 */
async function migrateLegacyQueue(applicationId: string, db: IDBDatabase): Promise<{ records: OutboxRecord[]; meta: PersistedMeta } | null> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(legacyStorageKey(applicationId));
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: { records?: OutboxRecord[]; nextVersion?: number; nextSeq?: number; server?: ServerRow[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    try {
      localStorage.removeItem(legacyStorageKey(applicationId));
    } catch {
      // yoksay
    }
    return null;
  }
  const records = Array.isArray(parsed.records) ? parsed.records : [];
  const meta: PersistedMeta = {
    nextVersion: parsed.nextVersion ?? 0,
    nextSeq: parsed.nextSeq ?? 0,
    server: Array.isArray(parsed.server) ? parsed.server : [],
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["records", "meta"], "readwrite");
    for (const record of records) tx.objectStore("records").put(record);
    tx.objectStore("meta").put(meta, "meta");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  try {
    localStorage.removeItem(legacyStorageKey(applicationId));
  } catch {
    // Silinemese de göç zaten tamamlandı (IndexedDB kalıcı kopyayı taşıyor); bir sonraki
    // açılışta eski anahtar yine görülürse göç idempotent'tir (aynı veri tekrar put edilir).
  }
  return { records, meta };
}

function indexedDbPersistence(applicationId: string): Persistence {
  let dbPromise: Promise<IDBDatabase> | null = null;
  function db(): Promise<IDBDatabase> {
    if (!dbPromise) dbPromise = openOutboxDb(applicationId);
    return dbPromise;
  }
  return {
    async loadAll() {
      const database = await db();
      const migrated = await migrateLegacyQueue(applicationId, database);
      if (migrated) {
        return { records: migrated.records, ...migrated.meta };
      }
      const { records, meta } = await idbLoadAll(database);
      return { records, nextVersion: meta?.nextVersion ?? 0, nextSeq: meta?.nextSeq ?? 0, server: meta?.server ?? [] };
    },
    saveAll(records, meta) {
      void db().then((database) => {
        try {
          const tx = database.transaction(["records", "meta"], "readwrite");
          const store = tx.objectStore("records");
          store.clear();
          for (const record of records) store.put(record);
          tx.objectStore("meta").put(meta, "meta");
        } catch {
          // Depo doluysa/IndexedDB kullanılamıyorsa bellek kuyruğu gönderime devam eder.
        }
      });
    },
  };
}

/** Testler için: hiçbir tarayıcı API'si kullanmayan, saf bellek içi kalıcılık. */
export function memoryPersistence(): Persistence {
  let records: OutboxRecord[] = [];
  let meta: PersistedMeta = { nextVersion: 0, nextSeq: 0, server: [] };
  return {
    async loadAll() {
      return { records, ...meta };
    },
    saveAll(nextRecords, nextMeta) {
      records = nextRecords;
      meta = nextMeta;
    },
  };
}

const boxes = new Map<string, AnswerOutbox>();

export function getAnswerOutbox(applicationId: string): AnswerOutbox {
  let box = boxes.get(applicationId);
  if (!box) {
    box = new AnswerOutbox(applicationId, indexedDbPersistence(applicationId));
    boxes.set(applicationId, box);
  }
  return box;
}

/** Testler kutuyu paylaşmasın. */
export function dropAnswerOutbox(applicationId: string) {
  boxes.delete(applicationId);
}
