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

/**
 * Saf arama (test edilebilir kısım): paketin `payload`'ı backend `ExamPackageService`'in
 * ürettiği `{applicationId, sections: [{sectionId, items}, ...]}` şekli — her bölüm, canlı
 * `GET /applications/{id}/sections/{sid}/content`'in döndürdüğü AYNI `items` dizisini taşır
 * (ikisi de `ExamPaperBuilder.sectionView`'dan geçer). `null` dönerse çağıran ağa düşmeli.
 */
export function sectionItemsFromPackage(payload: Record<string, unknown> | null | undefined, sectionId: string): unknown[] | null {
  const sections = payload?.sections;
  if (!Array.isArray(sections)) {
    return null;
  }
  for (const section of sections) {
    if (section && typeof section === "object" && String((section as Record<string, unknown>).sectionId) === sectionId) {
      const items = (section as Record<string, unknown>).items;
      return Array.isArray(items) ? items : null;
    }
  }
  return null;
}

/** Çevrimdışı düşme yolu: paket varsa ve bu bölümü içeriyorsa onun `items`'ını döner, yoksa `null`. */
export async function loadPackagedSectionContent(applicationId: string, sectionId: string): Promise<unknown[] | null> {
  const stored = await loadPackage(applicationId);
  return sectionItemsFromPackage(stored?.payload ?? null, sectionId);
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
