"use client";

/**
 * F3-03/Adım 3: süre uyarısı duyurulmalı — ekran okuyucu kullanıcısı görsel sayacı (saniyede
 * birkaç kez güncellenen bir metin) duyamaz/takip edemez; kalan %50, %25 ve son 2 dakikada
 * BİR KEZ, canlı bölgeden duyuru yapılır. WCAG 2.2'nin "süre sınırı ayarlanabilir olmalı"
 * istisnasının gerekçesi: sınavda süre AYARLANAMAZ (ek süre yalnız F3-09'un düzenleme
 * profiliyle verilir, kullanıcı tarafından uzatılamaz) — bu paket süreyi DEĞİŞTİRMEZ, yalnız
 * görünmez olanı duyurulabilir yapar.
 */
import { useEffect, useRef, useState } from "react";

const LAST_MINUTES_THRESHOLD_MS = 2 * 60_000;
const FRACTION_THRESHOLDS = [0.5, 0.25] as const;

function minutesLeft(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}

/**
 * `remainingMs`/`totalMs` null ise (süre sınırı yok) hiçbir şey duyurmaz. Her eşik, AYNI
 * `totalMs` için en fazla BİR kez duyurulur — süre ilerledikçe (geri gitmez) tekrar tetiklenmez;
 * `totalMs` değişince (yeni bölüme/sınava geçildi) duyuru geçmişi sıfırlanır.
 */
export function useTimeAnnouncement(remainingMs: number | null, totalMs: number | null): string | null {
  const announced = useRef<Set<string>>(new Set());
  const lastTotal = useRef<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (lastTotal.current !== totalMs) {
      announced.current = new Set();
      lastTotal.current = totalMs;
      setMessage(null);
    }
  }, [totalMs]);

  useEffect(() => {
    if (remainingMs == null || totalMs == null || totalMs <= 0) return;
    if (remainingMs <= LAST_MINUTES_THRESHOLD_MS) {
      if (announced.current.has("last2")) return;
      announced.current.add("last2");
      setMessage("Less than 2 minutes left.");
      return;
    }
    for (const fraction of FRACTION_THRESHOLDS) {
      const id = String(fraction);
      if (remainingMs <= totalMs * fraction && !announced.current.has(id)) {
        announced.current.add(id);
        const percent = Math.round(fraction * 100);
        setMessage(`${percent}% of the time is left: about ${minutesLeft(remainingMs)} minutes.`);
        return;
      }
    }
  }, [remainingMs, totalMs]);

  return message;
}
