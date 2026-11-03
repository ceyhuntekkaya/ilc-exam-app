import { afterEach, describe, expect, it, vi } from "vitest";
import { AnswerOutbox, dropAnswerOutbox, getAnswerOutbox, type Persistence } from "./answerOutbox";

/** persist()'in fire-and-forget IndexedDB yazımının gerçekten bitmesini bekler (gerçek zamanlayıcı). */
function flushIndexedDb() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/**
 * F3-06/Adım 2: `answerOutbox`'ın depolaması IndexedDB'ye taşındı — "Göç kaybetmemeli... göç
 * kaybı sessizdir, test etmezsen fark etmezsin" (görev dosyası). Bu dosya gerçek `indexedDB`
 * global'ini kullanır (`fake-indexeddb/auto`, `src/test/setup.ts`) — ham glue kod olarak
 * (`mediaOutbox.ts`'teki gibi) test edilmeden geçilmedi, çünkü burada kaybedilen bir öğrencinin
 * sınav cevabı.
 */
describe("answerOutbox — IndexedDB kalıcılığı ve localStorage göçü", () => {
  afterEach(() => {
    dropAnswerOutbox("app-migrate");
    dropAnswerOutbox("app-reload");
    dropAnswerOutbox("app-race");
    dropAnswerOutbox("app-discard");
    localStorage.clear();
  });

  it("migrates an existing localStorage queue into IndexedDB and clears the legacy key", async () => {
    const legacy = {
      records: [
        { itemId: "q1", answer: { optionId: "a" }, mediaId: null, intentId: null, localVersion: 1, state: "confirmed", seq: 3, tries: 0, hidden: false },
      ],
      nextVersion: 1,
      nextSeq: 3,
      server: [{ itemId: "q1", answer: { optionId: "a" }, seq: 3 }],
    };
    localStorage.setItem("ilc-answer-outbox:app-migrate", JSON.stringify(legacy));

    const box = getAnswerOutbox("app-migrate");
    await vi.waitFor(() => expect(box.isRestored()).toBe(true));

    expect(box.getAnswer("q1")).toEqual({ optionId: "a" });
    expect(localStorage.getItem("ilc-answer-outbox:app-migrate")).toBeNull();

    // Taşınan veri KALICI mı (bellekte değil, gerçekten IndexedDB'de) — yeni bir kutu (sayfa
    // yenileme simülasyonu), localStorage artık BOŞ, yine de aynı kaydı bulmalı.
    dropAnswerOutbox("app-migrate");
    const reopened = getAnswerOutbox("app-migrate");
    await vi.waitFor(() => expect(reopened.isRestored()).toBe(true));
    expect(reopened.getAnswer("q1")).toEqual({ optionId: "a" });
  });

  it("does not lose queued answers across a simulated page reload (no legacy data)", async () => {
    const first = getAnswerOutbox("app-reload");
    await vi.waitFor(() => expect(first.isRestored()).toBe(true));
    first.hydrate([]);
    first.put("q1", { text: "hello" });
    // persist() yazımı fire-and-forget (IndexedDB) — "sayfa yenileme" simülasyonundan önce
    // o yazımın GERÇEKTEN bitmesini bekle, aksi halde test kendi zamanlamasına bağlı olurdu.
    await flushIndexedDb();

    dropAnswerOutbox("app-reload");
    const reopened = getAnswerOutbox("app-reload");
    await vi.waitFor(() => expect(reopened.isRestored()).toBe(true));
    expect(reopened.getAnswer("q1")).toEqual({ text: "hello" });
  });

  it("never lets the async restore overwrite a write that already happened (deterministic race)", async () => {
    // Gerçek IndexedDB'nin kendi zamanlamasına güvenmek yerine (restore() birden çok adım
    // attığı için write genelde önce biter, bu da ezmeyi kazara "test edilemez" kılar) —
    // restore()'u KASITLI geciktiren bir persistence ile EZME senaryosunu GÜVENCEYE alıyoruz.
    const delayed: Persistence = {
      async loadAll() {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          records: [{ itemId: "q1", answer: { optionId: "old" }, mediaId: null, intentId: null, localVersion: 0, state: "confirmed", seq: 1, tries: 0, hidden: false }],
          nextVersion: 0,
          nextSeq: 1,
          server: [{ itemId: "q1", answer: { optionId: "old" }, seq: 1 }],
        };
      },
      saveAll() {
        // test bu dalı doğrulamıyor
      },
    };

    const box = new AnswerOutbox("app-race", delayed);
    // restore() henüz bitmeden (30ms'lik geciktirme sürerken) senkron bir put() gelir.
    box.put("q1", { optionId: "new" });
    expect(box.getAnswer("q1")).toEqual({ optionId: "new" });

    await vi.waitFor(() => expect(box.isRestored()).toBe(true), { timeout: 200 });

    // restore() şimdi "old" ile geldi ama q1 ZATEN vardı — EZİLMEMELİ.
    expect(box.getAnswer("q1")).toEqual({ optionId: "new" });
  });

  it("removes a discarded item from IndexedDB too, not just memory", async () => {
    const box = getAnswerOutbox("app-discard");
    await vi.waitFor(() => expect(box.isRestored()).toBe(true));
    box.hydrate([]);
    box.put("q1", { text: "draft" });
    box.discard("q1");
    expect(box.getAnswer("q1")).toBeUndefined();
    await flushIndexedDb();

    dropAnswerOutbox("app-discard");
    const reopened = getAnswerOutbox("app-discard");
    await vi.waitFor(() => expect(reopened.isRestored()).toBe(true));
    expect(reopened.getAnswer("q1")).toBeUndefined();
  });
});
