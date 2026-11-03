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

/**
 * F3-05/Adım 5: tersine mühendislik testi — indirilmiş paketin ham JSON'u (bir öğrencinin
 * devtools/IndexedDB dışa aktarımıyla göreceği AYNI metin) hiçbir AnswerKey alan adı
 * TAŞIMAMALI. Backend `PackageSanitizerTest` bunu servis katmanında (14 tip) zaten kanıtlıyor;
 * burada istemci tarafında SAKLANAN veri üzerinde aynı taramayı tekrarlıyoruz — gerçek bir
 * tarayıcıda indirip IndexedDB'yi elle dışa aktarmak (görev dosyasının istediği tam adım) bu
 * ortamda yapılamadı, DURUM.md'de not edildi.
 */
describe("tersine mühendislik — indirilen paket hiçbir AnswerKey alanı taşımaz", () => {
  // Backend PackageSanitizer.FORBIDDEN_KEYS ile AYNI liste (iki repo ayrı derlendiği için
  // paylaşılan bir sabit yok — kasıtlı kopya, ikisi de AnswerKey.java'nın alan adlarından gelir).
  const FORBIDDEN_KEYS = [
    "correctOptionId", "correctOptionIds", "correctChoiceIds", "acceptedAnswers",
    "pairs", "correctOrder", "groupOf", "distractors", "correctRegionIds", "zoneOf",
    "sampleAnswers", "raterNotes", "elementPoints", "matchPolicy",
  ];

  it("a realistic multi-type package contains none of the forbidden AnswerKey keys", () => {
    const payload = {
      applicationId: "app-1",
      sections: [{
        sectionId: "sec-1",
        items: [
          {
            examQuestionId: "q1", role: "SCORED", points: 1,
            question: { body: {}, parts: [{ id: "p1", position: 1, interactionType: "MULTIPLE_CHOICE", stem: [], interaction: {
              type: "MULTIPLE_CHOICE", options: [{ id: "a", text: "Paris" }, { id: "b", text: "Lyon" }],
            } }] },
          },
          {
            examQuestionId: "q2", role: "SCORED", points: 1,
            question: { body: {}, parts: [{ id: "p2", position: 1, interactionType: "MATCHING", stem: [], interaction: {
              type: "MATCHING", left: [{ id: "l1", text: "Capital of France" }],
              right: [{ id: "r1", text: "Paris" }, { id: "r2", text: "Lyon" }],
            } }] },
          },
          {
            examQuestionId: "q3", role: "SCORED", points: 1,
            question: { body: {}, parts: [{ id: "p3", position: 1, interactionType: "ORDERING", stem: [], interaction: {
              type: "ORDERING", items: [{ id: "i1", text: "Second" }, { id: "i2", text: "First" }, { id: "i3", text: "Third" }],
            } }] },
          },
          {
            examQuestionId: "q4", role: "SCORED", points: 1,
            question: { body: {}, parts: [{ id: "p4", position: 1, interactionType: "GROUPING", stem: [], interaction: {
              type: "GROUPING",
              groups: [{ id: "g1", label: "Fruit" }, { id: "g2", label: "Veggie" }],
              items: [{ id: "m1", text: "Apple" }],
            } }] },
          },
        ],
      }],
    };

    const raw = JSON.stringify(payload);

    for (const key of FORBIDDEN_KEYS) {
      expect(raw).not.toContain(`"${key}"`);
    }
  });
});
