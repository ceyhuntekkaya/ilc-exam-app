import { AnswerOutbox, memoryPersistence } from "@/src/features/exam-player/session/answerOutbox";
import { describe, it } from "vitest";
import { assertNoLoss, drain, fakeServer, waitUntilRestored } from "./harness";

/**
 * F3-17/Senaryo 4: "Cihaz değiştirme — ikinci cihaz sahiplik alır — F3-08 kuralı, iki cihazın
 * yanıtı da sunucuda." F3-08'in GERÇEK çözümü sunucu taraflıdır (`DeviceOwnership`/
 * `ConflictResolver`/`AnswerService.lockAndVerifyForAnswer`, ilc-parent) — bu paket ise
 * `ilc-app`'tedir (görev dosyası başlığı). Buradan test edilebilecek olan İSTEMCİ tarafının
 * KENDİ varsayımı: bir cihazın kuyruğu, BAŞKA bir cihazın AYNI uygulamaya yazdığını BİLMEDEN
 * de kendi kayıtlarını eksiksiz teslim eder — iki BAĞIMSIZ `AnswerOutbox` (iki cihazın kendi
 * yerel deposu, `memoryPersistence()` ile ayrı ayrı) aynı sahte sunucuya karşı drene edilir;
 * ikisinin de TÜM maddeleri sunucuda görünmeli (F3-08'in backend garantisinin istemci
 * tarafında KARŞILIK gelen varsayımı: kuyruk "ben tek cihazım" diye bir şey bilmez/varsaymaz).
 */
describe("Kaos 4 — cihaz değiştirme", () => {
  it("two independent devices queueing different items for the same application both deliver in full", async () => {
    const deviceA = new AnswerOutbox("chaos-device", memoryPersistence());
    await waitUntilRestored(deviceA);
    deviceA.hydrate([]);
    const deviceB = new AnswerOutbox("chaos-device", memoryPersistence());
    await waitUntilRestored(deviceB);
    deviceB.hydrate([]);

    const itemsA = ["q1", "q2", "q3"];
    const itemsB = ["q4", "q5"];
    for (const id of itemsA) deviceA.put(id, { device: "A", id });
    for (const id of itemsB) deviceB.put(id, { device: "B", id });

    const server = fakeServer();
    // Cihaz A yarı yolda ağ kaybeder, cihaz B hiç kesilmez — gerçekçi devralma senaryosu.
    drain(deviceA, server, () => false, itemsA.length);
    drain(deviceB, server, () => true);
    drain(deviceA, server, () => true);

    assertNoLoss([...itemsA, ...itemsB], server);
  });

  it("a stale device's queued answer still arrives after the device takes a long time to reconnect", async () => {
    const oldDevice = new AnswerOutbox("chaos-device-stale", memoryPersistence());
    await waitUntilRestored(oldDevice);
    oldDevice.hydrate([]);
    const newDevice = new AnswerOutbox("chaos-device-stale", memoryPersistence());
    await waitUntilRestored(newDevice);
    newDevice.hydrate([]);

    // Eski cihazda bir yanıt kuyrukta kalmış (devralmadan ÖNCE verilmiş).
    oldDevice.put("item-stale", { from: "old-device" });
    // Yeni cihaz sahipliği aldı, kendi yanıtlarını veriyor.
    newDevice.put("item-fresh", { from: "new-device" });

    const server = fakeServer();
    // Yeni cihaz hemen gönderir.
    drain(newDevice, server, () => true);
    // Eski cihaz GECİKMELİ olarak (uzun süre offline kaldıktan sonra) bağlanıp kendi
    // kuyruğunu boşaltır — F3-08/Kural 4: "hiçbir koşulda atılmaz."
    drain(oldDevice, server, () => true);

    assertNoLoss(["item-stale", "item-fresh"], server);
  });
});
