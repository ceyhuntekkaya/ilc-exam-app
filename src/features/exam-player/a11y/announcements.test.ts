import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTimeAnnouncement } from "./announcements";

/**
 * F3-03/Adım 3: süre uyarısı duyurulmalı — %50, %25, son 2 dakikada BİR KEZ (tekrar tekrar değil,
 * ekran okuyucu kullanıcısı her render'da aynı şeyi dinlemek istemez), süre sınırı yoksa hiç.
 */
describe("useTimeAnnouncement", () => {
  it("announces nothing when there is no time limit", () => {
    const { result, rerender } = renderHook(({ remaining, total }) => useTimeAnnouncement(remaining, total), {
      initialProps: { remaining: null as number | null, total: null as number | null },
    });
    expect(result.current).toBeNull();

    rerender({ remaining: 60_000, total: null });
    expect(result.current).toBeNull();
  });

  it("announces the 50% threshold exactly once as time crosses it", () => {
    const total = 10 * 60_000; // 10 dakika
    const { result, rerender } = renderHook(({ remaining }) => useTimeAnnouncement(remaining, total), {
      initialProps: { remaining: total },
    });
    expect(result.current).toBeNull();

    rerender({ remaining: total * 0.6 }); // hâlâ %50'nin üzerinde
    expect(result.current).toBeNull();

    rerender({ remaining: total * 0.5 }); // tam eşikte
    expect(result.current).toMatch(/50%/);

    // Süre ilerlerken (azalırken) aynı eşik TEKRAR duyurulmaz.
    rerender({ remaining: total * 0.45 });
    expect(result.current).toMatch(/50%/); // mesaj state'i korunur, YENİDEN üretilmez (aynı referans/metin)
  });

  it("announces the 25% threshold after the 50% one, and the last-2-minutes warning last", () => {
    const total = 20 * 60_000; // 20 dakika
    const { result, rerender } = renderHook(({ remaining }) => useTimeAnnouncement(remaining, total), {
      initialProps: { remaining: total },
    });

    rerender({ remaining: total * 0.5 });
    expect(result.current).toMatch(/50%/);

    rerender({ remaining: total * 0.25 });
    expect(result.current).toMatch(/25%/);

    rerender({ remaining: 90_000 }); // son 2 dakikanın altı
    expect(result.current).toBe("Less than 2 minutes left.");
  });

  it("resets the announcement history when the total duration changes (a new section/exam)", () => {
    const { result, rerender } = renderHook(({ remaining, total }) => useTimeAnnouncement(remaining, total), {
      initialProps: { remaining: 5 * 60_000, total: 10 * 60_000 },
    });
    rerender({ remaining: 5 * 60_000, total: 10 * 60_000 }); // %50'de
    expect(result.current).toMatch(/50%/);

    // Yeni bölüme geçildi: farklı bir toplam süre, tam zamanından başlıyor.
    rerender({ remaining: 15 * 60_000, total: 15 * 60_000 });
    expect(result.current).toBeNull();

    rerender({ remaining: 7.5 * 60_000, total: 15 * 60_000 });
    expect(result.current).toMatch(/50%/);
  });
});
