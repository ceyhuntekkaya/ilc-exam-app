import { AnswerOutbox, memoryPersistence } from "@/src/features/exam-player/session/answerOutbox";
import { describe, expect, it } from "vitest";
import { assertNoLoss, drain, fakeServer, waitUntilRestored } from "./harness";

/**
 * F3-17/Senaryo 2: "Uygulama kapatma — store yeniden yüklenir — Kuyruk kalıcı depodan
 * okunur." Gerçek yolda bu IndexedDB'dir (F3-06); burada AYNI `Persistence` nesnesi
 * (`memoryPersistence()`) iki `AnswerOutbox`'a verilerek "kapat-aç" taklit edilir — kutunun
 * KENDİSİ atılır, kalıcı katman AYNI kalır (tam olarak `answerOutbox.syncLoss.test.ts`'in
 * yaptığı gibi; bu dosya onu "kaos" paketinin kendi adlı/koşulan senaryosu olarak tekrarlar).
 */
describe("Kaos 2 — uygulama kapatma", () => {
  it("answers queued before a restart are still delivered after the store reloads", async () => {
    const persistence = memoryPersistence();
    let box = new AnswerOutbox("chaos-restart", persistence);
    await waitUntilRestored(box);
    box.hydrate([]);

    const ITEM_COUNT = 25;
    const itemIds = Array.from({ length: ITEM_COUNT }, (_, i) => `item-${i}`);
    for (const id of itemIds) box.put(id, { value: id });

    // Hiçbiri sunucuya gitmeden "kapat" — kutu atılır.
    box = new AnswerOutbox("chaos-restart", persistence);
    await waitUntilRestored(box);
    box.hydrate([]);

    expect(box.getSnapshot().filter((r) => r.state === "pending")).toHaveLength(ITEM_COUNT);

    const server = fakeServer();
    drain(box, server, () => true);

    assertNoLoss(itemIds, server);
  });

  it("a restart that happens mid-delivery (some answers already confirmed) does not resend confirmed answers as new", async () => {
    const persistence = memoryPersistence();
    let box = new AnswerOutbox("chaos-restart-partial", persistence);
    await waitUntilRestored(box);
    box.hydrate([]);

    const itemIds = ["a", "b", "c", "d"];
    for (const id of itemIds) box.put(id, { value: id });

    const server = fakeServer();
    // Yalnız "a" ve "b" sunucuya ulaşır, sonra kapanır.
    const next1 = box.nextSend();
    if (next1) {
      server.received.set(next1.itemId, { answer: next1.answer, seq: next1.seq });
      box.applyResult(next1.itemId, next1.localVersion, { status: "WRITTEN", serverSeq: next1.seq });
    }
    const next2 = box.nextSend();
    if (next2) {
      server.received.set(next2.itemId, { answer: next2.answer, seq: next2.seq });
      box.applyResult(next2.itemId, next2.localVersion, { status: "WRITTEN", serverSeq: next2.seq });
    }
    expect(server.received.size).toBe(2);

    box = new AnswerOutbox("chaos-restart-partial", persistence);
    await waitUntilRestored(box);
    box.hydrate([...server.received.entries()].map(([itemId, row]) => ({ itemId, answer: row.answer, seq: row.seq })));

    // Kalan iki madde hâlâ kuyrukta; onaylanmış ikisi tekrar "pending" olarak yüklenmemeli.
    expect(box.getSnapshot().filter((r) => r.state === "pending")).toHaveLength(2);

    drain(box, server, () => true);
    assertNoLoss(itemIds, server);
  });
});
