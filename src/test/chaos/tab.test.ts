import { dropAnswerOutbox, getAnswerOutbox } from "@/src/features/exam-player/session/answerOutbox";
import { flushAnswersKeepalive } from "@/src/features/exam-player/session/answerOutboxClient";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertNoLoss, drain, fakeServer } from "./harness";

const APPLICATION_ID = "chaos-tab";

/**
 * F3-17/Senaryo 3: "Sekme kapatma — beforeunload + yeniden açılış — Yarım yanıt kaybolmaz."
 * `flushAnswersKeepalive`'ın (answerOutboxClient.ts, `pagehide` olayına bağlı) GERÇEK davranışı
 * test edilir: bu fonksiyon ASLA kutudan bir kayıt SİLMEZ — yalnız sığanı tek istekte
 * `keepalive: true` ile göndermeye ÇALIŞIR (yanıtı beklemez, {@code confirmSnapshot} ÇAĞIRMAZ).
 * Bu yüzden büyüklüğü/istek başarısı ne olursa olsun kutunun KENDİSİ hiçbir şey kaybetmez —
 * asıl "yarım yanıt kaybolmaz" garantisi buradan gelir: yeniden açılışta normal `pump()`
 * döngüsü AYNI kayıtları (hâlâ "pending") bulur ve gönderir.
 */
describe("Kaos 3 — sekme kapatma", () => {
  afterEach(() => {
    dropAnswerOutbox(APPLICATION_ID);
    vi.unstubAllGlobals();
  });

  it("flushAnswersKeepalive never removes anything from the outbox, even when the batch is too large to fit one request", async () => {
    const box = getAnswerOutbox(APPLICATION_ID);
    box.hydrate([]);
    // Kota (60000 karakter) bilerek aşılacak kadar büyük, çok sayıda madde.
    const ITEM_COUNT = 40;
    const itemIds = Array.from({ length: ITEM_COUNT }, (_, i) => `item-${i}`);
    for (const id of itemIds) box.put(id, { text: "x".repeat(3000) });

    const fetchCalls: unknown[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit) => {
      fetchCalls.push({ url, body: init.body });
      return Promise.resolve({ ok: true } as Response);
    }));

    flushAnswersKeepalive(APPLICATION_ID, "token-1");

    // Kuyrukta HİÇBİR şey değişmedi — "sekme kapatma" kutuyu asla boşaltmaz.
    expect(box.snapshot()).toHaveLength(ITEM_COUNT);
    expect(fetchCalls).toHaveLength(1);

    // "Yeniden açılış": aynı kutu (gerçek yolda IndexedDB'den restore), ağ açık, normal gönderim.
    vi.unstubAllGlobals();
    const server = fakeServer();
    drain(box, server, () => true);

    assertNoLoss(itemIds, server);
  });

  it("does nothing when there is no pending work (no spurious fetch)", () => {
    const box = getAnswerOutbox(APPLICATION_ID);
    expect(box.snapshot()).toHaveLength(0);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    flushAnswersKeepalive(APPLICATION_ID, "token-1");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
