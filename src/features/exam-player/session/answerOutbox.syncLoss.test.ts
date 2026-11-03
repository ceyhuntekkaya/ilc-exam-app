import { describe, expect, it, vi } from "vitest";
import { AnswerOutbox, memoryPersistence, type AnswerSendResult } from "./answerOutbox";

/**
 * F3-06/Adım 4 (görev dosyasının kayıp testi): "100 yanıt kuyruğa, ağ kesik, tarayıcı
 * kapat-aç, ağ açık → 100 yanıt sunucuda." `answerOutboxClient.ts`'in DOM/window'a bağlı
 * tüm pompa döngüsünü taklit etmek yerine (o yalnız nakliye katmanı), burada `AnswerOutbox`'ın
 * KENDİSİNİN — nextSend/applyResult/applyTransportError döngüsünün — 100 maddede, sürekli ağ
 * hatasında, bir "tarayıcı kapat-aç" (kutuyu bırak, AYNI kalıcılıktan yeniden oluştur) sonrasında
 * HİÇBİR cevabı kaybetmediği doğrudan kanıtlanıyor. Üstel geri çekilme ve kısmi senkron zaten
 * mevcut (`answerOutboxClient.ts`'in `delay` merdiveni + `AnswerCloseGuard`'ın tüm-veya-hiç
 * transaction'ı, backend) — bu test o GARANTİYİ (hiçbir cevap kalıcı olarak kaybolmaz) kilitler.
 *
 * Bu testler yazılırken BİR gerçek bulgu çıktı: `nextSend()` yalnız sunucu hidrasyonunu
 * (`hydrated`) kontrol ediyordu, depo geri yüklemesini (`restored`, F3-06) DEĞİL — üretimde
 * ağdan (sunucu listesi) her zaman daha hızlı bitmesi (IndexedDB) bir GARANTİ değildi. Düzeltildi
 * (`answerOutbox.ts`): `nextSend()` artık İKİSİNİ de bekler.
 */
describe("answerOutbox — 100 cevap, ağ kopması ve 'tarayıcı kapat-aç' sonrası sıfır kayıp", () => {
  it("every one of 100 queued answers eventually reaches the server after an outage and a reload", async () => {
    const persistence = memoryPersistence();
    let box = new AnswerOutbox("app-loss", persistence);
    await vi.waitFor(() => expect(box.isRestored()).toBe(true));
    box.hydrate([]);

    const ITEM_COUNT = 100;
    for (let i = 0; i < ITEM_COUNT; i++) {
      box.put(`item-${i}`, { value: i });
    }

    // Ağ kesik: her madde en az bir kez denenir ve HEPSİ ağ hatasıyla (geçici, 0 — "no network")
    // başarısız olur. nextSend() aynı anda tek madde döndürür (gerçek pump() döngüsü de böyle).
    const networkDownAttempts = ITEM_COUNT * 3; // her maddeye ~birkaç kez şans ver
    for (let i = 0; i < networkDownAttempts; i++) {
      const next = box.nextSend();
      if (!next) break;
      box.applyTransportError(next.itemId, next.localVersion, { status: 0, message: "network down" });
    }
    // Hiçbiri "failed" olmamalı (0 durumu geçici kabul edilir, kalıcı reddedilmez) — hepsi hâlâ "pending".
    expect(box.getSnapshot().filter((r) => r.state === "failed")).toHaveLength(0);
    expect(box.getSnapshot().filter((r) => r.state === "pending")).toHaveLength(ITEM_COUNT);

    // "Tarayıcı kapat-aç": kutu atılır, AYNI kalıcılıktan (göç değil, bu paketin IndexedDB'si)
    // YENİDEN oluşturulur — restore() depodaki (henüz sunucuya gitmemiş) 100 kaydı geri yükler.
    box = new AnswerOutbox("app-loss", persistence);
    await vi.waitFor(() => expect(box.isRestored()).toBe(true));
    box.hydrate([]);

    // Ağ açık: sunucuyu TAKLİT eden basit bir alıcı — her itemId'yi en fazla BİR kez kabul eder,
    // aldığı seq'i ve içeriği kaydeder (gerçek sunucunun idempotans garantisinin taklidi).
    const server = new Map<string, { answer: unknown; seq: number }>();
    let guard = 0;
    while (box.hasWork() && guard < ITEM_COUNT * 2) {
      guard++;
      const next = box.nextSend();
      if (!next) continue;
      server.set(next.itemId, { answer: next.answer, seq: next.seq });
      const result: AnswerSendResult = { status: "WRITTEN", serverSeq: next.seq };
      box.applyResult(next.itemId, next.localVersion, result);
    }

    expect(server.size).toBe(ITEM_COUNT);
    for (let i = 0; i < ITEM_COUNT; i++) {
      expect(server.get(`item-${i}`)?.answer).toEqual({ value: i });
    }
    expect(box.getSnapshot().filter((r) => r.state !== "confirmed")).toHaveLength(0);
    expect(box.hasWork()).toBe(false);
  });

  it("a mid-stream flaky network (some attempts fail, then succeed) still delivers every answer exactly once", async () => {
    const persistence = memoryPersistence();
    const box = new AnswerOutbox("app-flaky", persistence);
    await vi.waitFor(() => expect(box.isRestored()).toBe(true));
    box.hydrate([]);

    const ITEM_COUNT = 40;
    for (let i = 0; i < ITEM_COUNT; i++) box.put(`item-${i}`, { value: i });

    const server = new Map<string, number>();
    let attempt = 0;
    let guard = 0;
    while (box.hasWork() && guard < ITEM_COUNT * 10) {
      guard++;
      const next = box.nextSend();
      if (!next) continue;
      attempt++;
      // Her 3 denemeden biri ağ hatası, diğerleri başarı — gerçekçi, kesintili bir bağlantı.
      if (attempt % 3 === 0) {
        box.applyTransportError(next.itemId, next.localVersion, { status: 0, message: "flaky" });
        continue;
      }
      server.set(next.itemId, (server.get(next.itemId) ?? 0) + 1);
      box.applyResult(next.itemId, next.localVersion, { status: "WRITTEN", serverSeq: next.seq });
    }

    expect(server.size).toBe(ITEM_COUNT);
    // Her madde TAM OLARAK bir kez "yazıldı" sayılmalı (sunucuya aynı itemId için iki farklı
    // başarı bildirimi gitmemeli) — kuyruk sırayı/çiftliği karıştırmamış.
    for (const count of server.values()) expect(count).toBe(1);
  });
});
