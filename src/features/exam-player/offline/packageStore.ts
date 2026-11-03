"use client";

import { checkStorageQuota, type StorageQuotaStatus } from "@/src/lib/pwa/version";

/**
 * F3-05/Adım 3: çevrimdışı sınav paketi — IndexedDB'de durur (`mediaOutbox.ts`'in deseni: ayrı
 * veritabanı, satırlar basit anahtar/değer). Yalnız backend `PackageSanitizer`'dan geçmiş,
 * cevap anahtarsız JSON saklanır — bu dosya anahtar sızıntısına karşı İKİNCİ bir savunma
 * DEĞİLDİR, güvenmekle yetinir (gerçek savunma backend'de; burada tekrar filtrelemek yanlış
 * bir güvence verir). Medya dosyaları BURADA değil — `public/sw.js`'in önbellek kapsamında
 * (Adım 4'ün indirme ekranı tetikler).
 */

export type StoredPackage = {
  applicationId: string;
  storedAt: string;
  payload: Record<string, unknown>;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("ilc-exam-package", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("packages")) {
        request.result.createObjectStore("packages");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePackage(applicationId: string, payload: Record<string, unknown>): Promise<void> {
  const record: StoredPackage = { applicationId, storedAt: new Date().toISOString(), payload };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("packages", "readwrite");
    tx.objectStore("packages").put(record, applicationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadPackage(applicationId: string): Promise<StoredPackage | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("packages", "readonly");
    const request = tx.objectStore("packages").get(applicationId);
    request.onsuccess = () => resolve((request.result as StoredPackage | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePackage(applicationId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("packages", "readwrite");
    tx.objectStore("packages").delete(applicationId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function hasPackage(applicationId: string): Promise<boolean> {
  return (await loadPackage(applicationId)) != null;
}

export type DownloadGuardResult = {
  allowed: boolean;
  reason: string | null;
  availableBytes: number | null;
};

/**
 * Saf karar fonksiyonu (test edilebilir kısım) — `navigator.storage.estimate()`'in SONUCUNU alır,
 * kendisi çağırmaz. Görev dosyası: "yetersizse sınav başlatılmaz, net mesaj verilir — yarım
 * paketle ortada kalmak en kötü sonuç." Tarayıcı desteklemiyorsa ENGELLEMEZ (F3-01'in
 * `checkStorageQuota` kararıyla aynı: bilinmeyeni "yeterli" say, kullanıcıyı durdurma).
 */
export function decideDownload(quota: StorageQuotaStatus): DownloadGuardResult {
  if (!quota.supported || !quota.belowThreshold) {
    return { allowed: true, reason: null, availableBytes: quota.availableBytes };
  }
  return {
    allowed: false,
    reason: "Not enough free storage on this device to download the test package. Free up space and try again.",
    availableBytes: quota.availableBytes,
  };
}

/** İndirmeden ÖNCE çağrılır. `estimatedBytes` paketin (+ henüz önbelleklenmemiş medyanın) tahmini boyutu. */
export async function guardDownload(estimatedBytes: number): Promise<DownloadGuardResult> {
  const quota = await checkStorageQuota(estimatedBytes);
  return decideDownload(quota);
}

/** Reddedilirse uyarı verilir ama indirme ENGELLENMEZ (görev dosyası). */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) {
    return false;
  }
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
