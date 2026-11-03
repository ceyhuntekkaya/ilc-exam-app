import { AnswerOutbox, memoryPersistence } from "@/src/features/exam-player/session/answerOutbox";
import { describe, expect, it } from "vitest";
import { assertNoLoss, drain, fakeServer, waitUntilRestored } from "./harness";

/**
 * F3-17/Senaryo 1 (görev dosyasının tablosu): "Ağ kesme — fetch reddeder, sonra döner —
 * Kuyruk birikir, dönünce tamamı gider." `AnswerOutbox.nextSend/applyTransportError`'ın
 * gerçek pump döngüsünün (answerOutboxClient.ts) taklidi — DOM'a bağlı olmayan hali.
 */
describe("Kaos 1 — ağ kesme", () => {
  it("queues answers while the network is down and delivers every one once it returns", async () => {
    const box = new AnswerOutbox("chaos-network", memoryPersistence());
    await waitUntilRestored(box);
    box.hydrate([]);

    const ITEM_COUNT = 50;
    const itemIds = Array.from({ length: ITEM_COUNT }, (_, i) => `item-${i}`);
    for (const id of itemIds) box.put(id, { value: id });

    const server = fakeServer();

    // Ağ kesik: kuyruk hiçbiri gitmeden birikir.
    drain(box, server, () => false, ITEM_COUNT * 3);
    expect(server.received.size).toBe(0);
    expect(box.getSnapshot().filter((r) => r.state === "pending")).toHaveLength(ITEM_COUNT);
    expect(box.getSnapshot().filter((r) => r.state === "failed")).toHaveLength(0);

    // Ağ döner: tamamı gider.
    drain(box, server, () => true);
    assertNoLoss(itemIds, server);
    expect(box.hasWork()).toBe(false);
  });

  it("a network that flickers (fails most attempts) still delivers every answer exactly once", async () => {
    const box = new AnswerOutbox("chaos-network-flaky", memoryPersistence());
    await waitUntilRestored(box);
    box.hydrate([]);

    const ITEM_COUNT = 30;
    const itemIds = Array.from({ length: ITEM_COUNT }, (_, i) => `item-${i}`);
    for (const id of itemIds) box.put(id, { value: id });

    const server = fakeServer();
    let attempt = 0;
    drain(box, server, () => {
      attempt++;
      return attempt % 4 !== 0; // her 4. deneme ağ kesik
    });

    assertNoLoss(itemIds, server);
  });
});
