import { describe, expect, it } from "vitest";
import { decideDownload, sectionItemsFromPackage } from "@/src/features/exam-player/offline/packageStore";

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

/**
 * F3-05/Adım 4: `ExamFlowProvider`'ın "paket varsa ondan okur" bağlantısının saf çekirdeği —
 * `page.tsx`'in çevrimdışı düşme yolu bu aramaya dayanıyor (bkz. `sectionContent` çağrısının
 * `.catch`'i).
 */
describe("sectionItemsFromPackage — çevrimdışı düşme yolu", () => {
  it("returns the matching section's items when the package has that section", () => {
    const payload = { sections: [{ sectionId: "sec-1", items: [{ examQuestionId: "q1" }] }] };

    expect(sectionItemsFromPackage(payload, "sec-1")).toEqual([{ examQuestionId: "q1" }]);
  });

  it("returns null when the package does not contain the requested section", () => {
    const payload = { sections: [{ sectionId: "sec-1", items: [] }] };

    expect(sectionItemsFromPackage(payload, "sec-2")).toBeNull();
  });

  it("returns null when there is no package at all", () => {
    expect(sectionItemsFromPackage(null, "sec-1")).toBeNull();
  });

  it("returns null for a malformed payload instead of throwing", () => {
    expect(sectionItemsFromPackage({ sections: "not-an-array" }, "sec-1")).toBeNull();
    expect(sectionItemsFromPackage({}, "sec-1")).toBeNull();
  });
});
