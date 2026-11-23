"use client";

import { readSession } from "@/src/features/exam-flow/session";
import { getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { claimMedia, releaseMedia } from "@/src/features/exam-player/session/playerGuard";
import { jobsToPersist } from "@/src/features/exam-player/session/mediaOutboxQueue";
import { uploadApplicationMedia } from "@/src/features/exam-player/session/studentMediaApi";

type MediaJob = {
  id: string;
  applicationId: string;
  recipientId: string;
  itemId: string;
  intentId: string;
  fileName: string;
  mimeType: string;
  durationMs: number;
  durable: boolean;
};

export type SavedRecording = { mediaId: string; url: string; durationMs: number | null };

const jobs: MediaJob[] = [];
const memoryBlobs = new Map<string, Blob>();
/** Yalnız kuyrukta hâlâ bekleyen (yeniden denenen) işlerin hatası. Kalıcı hata buraya yazılmaz: söz reddedilir. */
const errors = new Map<string, string>();
const results = new Map<string, { resolve: (value: SavedRecording) => void; reject: (err: Error) => void }>();
const listeners = new Set<() => void>();
const idleWaiters: (() => void)[] = [];
let pumping = false;
let revision = 0;
let resumed: string | null = null;

function lockId(itemId: string) {
  return `answer-upload:${itemId}`;
}

function notify() {
  revision += 1;
  for (const listener of listeners) listener();
  if (!jobs.length && !pumping) {
    const waiting = idleWaiters.splice(0);
    for (const resolve of waiting) resolve();
  }
}

export function subscribeMediaUploads(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function mediaUploadRevision() {
  return revision;
}

export function mediaUploadError(itemId: string) {
  return errors.get(itemId) ?? null;
}

/**
 * F3-10/Adım 3: kuyrukta ne kadar süredir ("sıkışık") beklediği — IndexedDB şemasına YENİ bir
 * alan EKLEMEDEN (Dokunulmayacaklar), `job.id`'nin KENDİSİNE gömülü zaman damgasından (`${itemId}
 * :${Date.now()}`, bkz. enqueueRecording) okunur. İş yoksa veya bitmişse null.
 */
export function mediaUploadAgeMs(itemId: string): number | null {
  const job = jobs.find((item) => item.itemId === itemId);
  if (!job) return null;
  const ts = Number(job.id.slice(job.id.lastIndexOf(":") + 1));
  return Number.isFinite(ts) ? Date.now() - ts : null;
}

export function mediaUploadsPending() {
  return jobs.length > 0 || pumping;
}

/** Bu sorunun kaydı kuyrukta mı (sayfa yenilendikten sonra sürdürülen yükleme dahil)? */
export function mediaUploadQueued(itemId: string) {
  return jobs.some((job) => job.itemId === itemId);
}

export function waitForMediaUploads(): Promise<void> {
  if (!mediaUploadsPending()) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

export function enqueueRecording(input: {
  applicationId: string;
  recipientId: string;
  itemId: string;
  intentId: string;
  file: File;
  durationMs: number;
}): Promise<SavedRecording> {
  const job: MediaJob = {
    id: `${input.itemId}:${Date.now()}`,
    applicationId: input.applicationId,
    recipientId: input.recipientId,
    itemId: input.itemId,
    intentId: input.intentId,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    durationMs: input.durationMs,
    durable: false,
  };
  claimMedia(lockId(job.itemId));
  jobs.push(job);
  memoryBlobs.set(job.id, input.file);
  errors.delete(job.itemId);
  notify();
  const promise = new Promise<SavedRecording>((resolve, reject) => {
    results.set(job.id, { resolve, reject });
  });
  void idbPut(job.id, input.file).then((stored) => {
    job.durable = stored;
    if (stored) persistJobs();
  }).finally(() => void pump());
  return promise;
}

/**
 * "Try upload again": bekleyen işi hemen yeniden dener. Kuyrukta bu soru için iş YOKSA kilit alınmaz — eskiden
 * alınıyordu ve bırakacak iş olmadığından sayfa kilitli kalıyordu (Break/Next/Back çalışmıyor, kayıt başlamıyordu).
 */
export function retryMediaUpload(itemId: string) {
  errors.delete(itemId);
  if (!jobs.some((job) => job.itemId === itemId)) {
    notify();
    return;
  }
  claimMedia(lockId(itemId));
  notify();
  void pump();
}

/**
 * Yeniden denemekle düzelmeyecek hata: iş bırakılır, kilit açılır, öğrenci mesajı görür.
 * 409'un çoğu geçicidir (oturum devri, eşzamanlı yazma) ve yeniden denenir; ama bölüm/sınav kapandıysa
 * (ANSWER_LOCKED, SECTION_CLOSED) sonsuz deneme sayfayı kilitli tutardı.
 */
export function isFatalUploadError(status: number, code?: string): boolean {
  if (status === 409) return code === "ANSWER_LOCKED" || code === "SECTION_CLOSED";
  return status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429;
}

/** Sayfa yeniden açılınca bitmemiş yüklemeyi sürdürür. Deneme hakkı ancak cevap satırı onaylanınca artar. */
export function resumeMediaUploads(applicationId: string, recipientId: string) {
  if (resumed === applicationId) return;
  resumed = applicationId;
  for (const job of readJobs()) {
    if (job.applicationId !== applicationId) continue;
    if (jobs.some((item) => item.id === job.id)) continue;
    jobs.push({ ...job, recipientId, durable: true });
    claimMedia(lockId(job.itemId));
  }
  if (jobs.length) void pump();
}

async function pump() {
  if (pumping) return;
  pumping = true;
  notify();
  try {
    while (jobs.length) {
      const job = jobs[0];
      const outcome = await attempt(job);
      if (outcome === "retry") await wait(2000);
    }
  } finally {
    pumping = false;
    notify();
  }
}

async function attempt(job: MediaJob): Promise<"done" | "retry"> {
  try {
    const blob = (await idbGet(job.id)) ?? memoryBlobs.get(job.id) ?? null;
    if (!blob) throw Object.assign(new Error("The recording is missing. Please record again."), { status: 400 });
    const token = readSession(job.recipientId)?.sessionToken;
    if (!token) throw Object.assign(new Error("Your test session ended. Please open the test again."), { status: 401 });
    const file = new File([blob], job.fileName, { type: job.mimeType });
    const uploaded = await uploadApplicationMedia(job.applicationId, token, job.itemId, file, job.durationMs, job.intentId);
    const box = getAnswerOutbox(job.applicationId);
    const version = box.put(job.itemId, { mediaId: uploaded.mediaId }, uploaded.mediaId, job.intentId);
    await box.whenSettled(job.itemId, version).catch((err: unknown) => {
      // Cevap kutusu yalnız kalıcı retlerde "failed" der (bölüm kapandı, geçersiz cevap): yeniden yükleme düzeltmez.
      // Dosya sunucuda duruyor; döngüye girip sayfayı kilitli tutmamak için iş kalıcı hatayla biter.
      throw Object.assign(new Error(err instanceof Error && err.message ? err.message : "This answer was not saved."), {
        status: 422,
        code: "ANSWER_REJECTED",
      });
    });
    finishJob(job, blob, uploaded.mediaId, uploaded.durationMs ?? job.durationMs);
    return "done";
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0;
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code ?? "") : undefined;
    const message = err instanceof Error && err.message ? err.message : "We could not save your recording. Please try again.";
    if (!isFatalUploadError(status, code)) {
      errors.set(job.itemId, message);
      notify();
      return "retry";
    }
    // Kalıcı hata "Try upload again" bırakmaz: yeniden denenecek iş yok. Mesajı bileşen reddedilen sözden gösterir.
    errors.delete(job.itemId);
    jobs.shift();
    persistJobs();
    releaseMedia(lockId(job.itemId));
    results.get(job.id)?.reject(err instanceof Error ? err : new Error(message));
    results.delete(job.id);
    void idbDelete(job.id);
    memoryBlobs.delete(job.id);
    notify();
    return "done";
  }
}

function finishJob(job: MediaJob, blob: Blob, mediaId: string, durationMs: number | null) {
  jobs.shift();
  persistJobs();
  memoryBlobs.delete(job.id);
  void idbDelete(job.id);
  bumpAttempts(job.applicationId, job.itemId);
  releaseMedia(lockId(job.itemId));
  errors.delete(job.itemId);
  results.get(job.id)?.resolve({
    mediaId,
    url: URL.createObjectURL(blob),
    durationMs: durationMs != null && durationMs > 0 ? durationMs : null,
  });
  results.delete(job.id);
  notify();
}

function bumpAttempts(applicationId: string, itemId: string) {
  const key = `ilc-attempts:${applicationId}:${itemId}`;
  try {
    const next = Math.max(0, Number(sessionStorage.getItem(key)) || 0) + 1;
    sessionStorage.setItem(key, String(next));
  } catch {
    // sayaç yenilemede sıfırlanabilir; kayıt yine de tablodadır
  }
}

function jobsKey() {
  return "ilc-media-outbox";
}

function readJobs(): MediaJob[] {
  try {
    const raw = localStorage.getItem(jobsKey());
    const parsed = raw ? (JSON.parse(raw) as MediaJob[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistJobs() {
  try {
    localStorage.setItem(jobsKey(), JSON.stringify(jobsToPersist(readJobs(), jobs)));
  } catch {
    // bellek kuyruğu bu sayfa açıkken devam eder
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ilc-exam-media", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("blobs")) request.result.createObjectStore("blobs");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(id: string, blob: Blob): Promise<boolean> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

async function idbGet(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("blobs", "readonly");
      const request = tx.objectStore("blobs").get(id);
      request.onsuccess = () => resolve((request.result as Blob) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function idbDelete(id: string) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // bellekten de silindi
  }
}
