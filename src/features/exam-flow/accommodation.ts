"use client";

import { useEffect, useState } from "react";
import { fetchAccommodationPresentation, type AccommodationPresentation } from "@/src/features/exam-flow/api";

const NONE: AccommodationPresentation = { screenReader: false, largeFont: false, highContrast: false };

/**
 * F3-09/Adım 7: sunum düzenlemeleri — bir kez okunur (oturum boyunca değişmesi beklenmez,
 * ve değişse de kozmetik bir ayar olduğu için sayfa yenilenince yansır, F3-09'un canlı-profil
 * kararıyla tutarlı). Hata/yükleme sırasında DAİMA `NONE` — bir ağ sorunu "etkin" göstermez.
 */
export function useAccommodationPresentation(applicationId: string | undefined, sessionToken: string | undefined): AccommodationPresentation {
  const [presentation, setPresentation] = useState<AccommodationPresentation>(NONE);

  useEffect(() => {
    // Varsayılan (useState) zaten NONE — applicationId/sessionToken yoksa burada senkron
    // setState ÇAĞRILMAZ (react-hooks/set-state-in-effect, K-03'ün aynı taban çizgisi kararı).
    if (!applicationId || !sessionToken) return;
    let cancelled = false;
    fetchAccommodationPresentation(applicationId, sessionToken).then((result) => {
      if (!cancelled) setPresentation(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applicationId, sessionToken]);

  return presentation;
}
