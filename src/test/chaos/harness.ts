import { AnswerOutbox, type AnswerSendResult } from "@/src/features/exam-player/session/answerOutbox";

/**
 * F3-17/Adım 1: sahte sunucu + yanıt sayacı. Görev dosyası: "Her senaryoda ölçülen tek şey
 * aynı: gönderilen yanıt sayısı = sunucuya ulaşan benzersiz yanıt sayısı. Bu ölçüm senaryodan
 * bağımsız bir yardımcıya yazılır, her senaryo onu çağırır." — bu dosya o yardımcıdır.
 */
export type FakeServer = {
  /** itemId → son kabul edilen içerik. Bir itemId en fazla bir kez "kabul edildi" sayılır. */
  received: Map<string, { answer: Record<string, unknown>; seq: number }>;
};

export function fakeServer(): FakeServer {
  return { received: new Map() };
}

/**
 * Kabul kriteri: "Kaos testi paketindeki tüm senaryolarda cevap kaybı sıfırdır." Gönderilmesi
 * BEKLENEN her itemId sunucuda var mı — varsa kayıp yok. Fazladan/hiç gönderilmemiş bir
 * itemId'nin sunucuda görünmesi de bir hatadır (farklı bir cevabın üstüne yazılmış olabilir).
 */
export function assertNoLoss(expectedItemIds: readonly string[], server: FakeServer) {
  const expected = new Set(expectedItemIds);
  const missing = [...expected].filter((id) => !server.received.has(id));
  if (missing.length > 0) {
    throw new Error(`Cevap kaybı: sunucuya ulaşmayan madde(ler): ${missing.join(", ")}`);
  }
  const unexpected = [...server.received.keys()].filter((id) => !expected.has(id));
  if (unexpected.length > 0) {
    throw new Error(`Beklenmeyen madde sunucuda: ${unexpected.join(", ")}`);
  }
}

/**
 * `AnswerOutbox`'ın kuyruğunu, verilen ağ durumuyla tüketir — gerçek `pump()` döngüsünün
 * (answerOutboxClient.ts) taklidi, DOM/window'a bağlı olmayan hali. `networkUp()` her denemede
 * tekrar sorulur (senaryo içinde ağ durumu değişebilir, ör. kesilip sonra dönebilir).
 */
export function drain(box: AnswerOutbox, server: FakeServer, networkUp: () => boolean, maxAttempts = 2000): void {
  // maxAttempts bir güvenlik sınırı DEĞİL, çağıranın "ağ bu kadar deneme boyunca kesik kalsın,
  // sonra senaryoya devam et" demesi için — küçük bir değer vermek sonsuz döngü anlamına gelmez,
  // kutunun hâlâ `hasWork()` olması beklenen bir sonuçtur (çağıran bunu kendi assert'iyle kontrol eder).
  let guard = 0;
  while (box.hasWork() && guard < maxAttempts) {
    guard++;
    const next = box.nextSend();
    if (!next) continue;
    if (!networkUp()) {
      box.applyTransportError(next.itemId, next.localVersion, { status: 0, message: "network down" });
      continue;
    }
    server.received.set(next.itemId, { answer: next.answer, seq: next.seq });
    const result: AnswerSendResult = { status: "WRITTEN", serverSeq: next.seq };
    box.applyResult(next.itemId, next.localVersion, result);
  }
}

/** `restore()` asenkron (IndexedDB senkron API sunmaz) — "yeniden başlatma" senaryoları bunu bekler. */
export async function waitUntilRestored(box: AnswerOutbox): Promise<void> {
  const start = Date.now();
  while (!box.isRestored()) {
    if (Date.now() - start > 5000) {
      throw new Error("AnswerOutbox 5 saniyede restore edilemedi");
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
