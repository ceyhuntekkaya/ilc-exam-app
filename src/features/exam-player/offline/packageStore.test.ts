import { describe, expect, it } from "vitest";
import { decideDownload } from "@/src/features/exam-player/offline/packageStore";

/**
 * F3-05/Adım 3: indirme kararı — `navigator.storage.estimate()`'in ham IndexedDB/tarayıcı
 * çağrısı jsdom'da polyfill'siz test edilemez (`mediaOutbox.ts`'teki idbPut/idbGet gibi, bilerek
 * dokunulmadı — ham glue kod); saf karar fonksiyonu (`decideDownload`) burada doğrulanıyor.
 */
describe("decideDownload — çevrimdışı paket kota kontrolü", () => {
  it("allows the download when there is enough free space", () => {
    const result = decideDownload({ supported: true, availableBytes: 100_000_000, belowThreshold: false });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("blocks the download with a clear message when space is below the threshold", () => {
    const result = decideDownload({ supported: true, availableBytes: 1_000, belowThreshold: true });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/storage/i);
    expect(result.availableBytes).toBe(1_000);
  });

  it("does not block the download when the browser cannot report storage (unknown is treated as enough)", () => {
    const result = decideDownload({ supported: false, availableBytes: null, belowThreshold: false });

    expect(result.allowed).toBe(true);
  });
});
