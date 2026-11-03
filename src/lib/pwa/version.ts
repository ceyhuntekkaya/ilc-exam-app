/**
 * `public/sw.js`'teki `CACHE_VERSION` ile EL İLE senkron tutulur — F3-01 bilerek build
 * adımı/kütüphane eklemiyor (Workbox yok), bu yüzden otomatik bir enjeksiyon yok.
 * Yeni kabuk sürümü çıkınca İKİSİ de bump edilir.
 */
export const CACHE_VERSION = "v1";

/**
 * F3-01: sürüm güncellemesi sınav SIRASINDA uygulanmaz (plan: "aktif oturum varsa yeni sürüm
 * bekler, oturum bitince devreye girer"). Rota tabanlı, bilerek basit — `exam-flow`'un iç
 * durumuna bağımlılık YOK, yalnız adresten okur (`app/student/exams/[recipientId]/{run,sections}`).
 */
export function isExamInProgress(pathname: string): boolean {
  return /^\/student\/exams\/[^/]+\/(run|sections)(\/|$)/.test(pathname);
}

export type StorageQuotaStatus = {
  supported: boolean;
  /** Boş alan (byte). Tarayıcı desteklemiyorsa null. */
  availableBytes: number | null;
  /** F3-01'in kendi eşiği — gerçek sınav paketi büyüklüğü F3-05'in işi, henüz bilinmiyor. */
  belowThreshold: boolean;
};

/** Sınav başlamadan önce kota yetersizse uyarmak için — `navigator.storage.estimate()`. */
export async function checkStorageQuota(thresholdBytes = 50 * 1024 * 1024): Promise<StorageQuotaStatus> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return { supported: false, availableBytes: null, belowThreshold: false };
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const available = quota != null && usage != null ? quota - usage : null;
    return {
      supported: true,
      availableBytes: available,
      belowThreshold: available != null && available < thresholdBytes,
    };
  } catch {
    return { supported: false, availableBytes: null, belowThreshold: false };
  }
}
