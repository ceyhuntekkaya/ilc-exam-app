"use client";

import { fetchPackage, grantPackageDownload } from "@/src/features/exam-flow/api";
import {
  decideDownload,
  hasPackage,
  requestPersistence,
  savePackage,
} from "@/src/features/exam-player/offline/packageStore";
import { checkStorageQuota } from "@/src/lib/pwa/version";
import { KidButton, KidNotice } from "@/src/features/student/ui";
import { IconCheck, IconDownload } from "@/src/ui/icons";
import { useEffect, useState } from "react";

/**
 * F3-05/Adım 4: indirme ekranı. Ağ olmadan açılamayacağı için öğrenci çevrimiçiyken bunu
 * görmeli (görev dosyası: "paket önceden iner") — en doğal yer, bölüm başlamadan ÖNCEki
 * "Parts of the test" sayfası (section listesi, zamanlayıcı henüz çalışmıyor).
 *
 * Medya dosyalarının (görsel/ses/video) önbelleklenmesi (`public/sw.js`) BU OTURUMDA YAPILMADI
 * — burada yalnız soru metni/etkileşim JSON'u indirilir (`PackageSanitizer`'dan geçmiş).
 * Yalnız metinden oluşan bir sınav bu haliyle tamamen çevrimdışı çözülebilir; medyalı bir
 * sınavda görsel/ses/video hâlâ ağ ister — ayrı bir oturumun işi, DURUM.md'de bulgu olarak var.
 */
export function PackageDownloadCard({
  applicationId,
  sessionToken,
}: {
  applicationId: string;
  sessionToken: string;
}) {
  const [downloaded, setDownloaded] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hasPackage(applicationId).then(setDownloaded);
  }, [applicationId]);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const quota = await checkStorageQuota();
      const decision = decideDownload(quota);
      if (!decision.allowed) {
        setError(decision.reason);
        return;
      }
      await requestPersistence();
      await grantPackageDownload(applicationId, sessionToken);
      const payload = await fetchPackage(applicationId, sessionToken);
      await savePackage(applicationId, payload);
      setDownloaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The test package could not be downloaded. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (downloaded == null) {
    return null;
  }

  if (downloaded) {
    return (
      <KidNotice tone="mint" icon={<IconCheck aria-hidden />}>
        This test is ready on this device. You can still take it if the internet disconnects.
      </KidNotice>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300/90 bg-white/70 p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600 sm:text-base">
        You can download this test now so you can still take it if the internet disconnects.
      </p>
      <KidButton variant="soft" disabled={busy} onClick={() => void download()}>
        <IconDownload aria-hidden />
        {busy ? "Downloading…" : "Download for offline"}
      </KidButton>
      {error ? <KidNotice tone="coral">{error}</KidNotice> : null}
    </div>
  );
}
