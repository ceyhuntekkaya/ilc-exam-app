"use client";

import { readSession } from "@/src/features/exam-flow/session";
import { getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { claimMedia, releaseMedia } from "@/src/features/exam-player/session/playerGuard";
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
};

const jobs: MediaJob[] = [];
const memoryBlobs = new Map<string, Blob>();
const errors = new Map<string, string>();
const results = new Map<string, { resolve: (value: { mediaId: string; url: string }) => void; reject: (err: Error) => void }>();
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

export function mediaUploadsPending() {
  return jobs.length > 0 || pumping;
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
}): Promise<{ mediaId: string; url: string }> {
  const job: MediaJob = {
    id: `${input.itemId}:${Date.now()}`,
    applicationId: input.applicationId,
    recipientId: input.recipientId,
    itemId: input.itemId,
    intentId: input.intentId,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    durationMs: input.durationMs,
  };
  claimMedia(lockId(job.itemId));
  jobs.push(job);
  memoryBlobs.set(job.id, input.file);
  errors.delete(job.itemId);
  persistJobs();
  notify();
  const promise = new Promise<{ mediaId: string; url: string }>((resolve, reject) => {
    results.set(job.id, { resolve, reject });
  });
  void idbPut(job.id, input.file).finally(() => void pump());
  return promise;
}

export function retryMediaUpload(itemId: string) {
  errors.delete(itemId);
  claimMedia(lockId(itemId));
  notify();
  void pump();
}

/** Sayfa yeniden açılınca bitmemiş yüklemeyi sürdürür. Deneme hakkı ancak cevap satırı onaylanınca artar. */
export function resumeMediaUploads(applicationId: string, recipientId: string) {
  if (resumed === applicationId) return;
  resumed = applicationId;
  for (const job of readJobs()) {
    if (job.applicationId !== applicationId) continue;
    if (jobs.some((item) => item.id === job.id)) continue;
    jobs.push({ ...job, recipientId });
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
    await box.whenSettled(job.itemId, version);
    finishJob(job, blob, uploaded.mediaId);
    return "done";
  } catch (err) {
    const status = typeof err === "object" && err && "status" in err ? Number((err as { status?: number }).status) : 0;
    const fatal = status >= 400 && status < 500 && status !== 401 && status !== 409 && status !== 408 && status !== 429;
    const message = err instanceof Error && err.message ? err.message : "We could not save your recording. Please try again.";
    errors.set(job.itemId, message);
    notify();
    if (!fatal) return "retry";
    jobs.shift();
    persistJobs();
    releaseMedia(lockId(job.itemId));
    results.get(job.id)?.reject(err instanceof Error ? err : new Error(message));
    results.delete(job.id);
    void idbDelete(job.id);
    memoryBlobs.delete(job.id);
    return "done";
  }
}

function finishJob(job: MediaJob, blob: Blob, mediaId: string) {
  jobs.shift();
  persistJobs();
  memoryBlobs.delete(job.id);
  void idbDelete(job.id);
  bumpAttempts(job.applicationId, job.itemId);
  releaseMedia(lockId(job.itemId));
  errors.delete(job.itemId);
  results.get(job.id)?.resolve({ mediaId, url: URL.createObjectURL(blob) });
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
    const rest = readJobs().filter((job) => !jobs.some((item) => item.applicationId === job.applicationId));
    localStorage.setItem(jobsKey(), JSON.stringify([...rest, ...jobs]));
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

async function idbPut(id: string, blob: Blob) {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // bellek kopyası duruyor
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
