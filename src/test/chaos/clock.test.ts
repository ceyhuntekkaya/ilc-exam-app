import { anchorClock, interpolateRemaining } from "@/src/features/exam-flow/clock";
import { enqueueEvent, readQueue } from "@/src/features/exam-flow/eventQueue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const APPLICATION_ID = "chaos-clock";

/**
 * F3-17/Senaryo 5: "Saat oynatma — sahte Date.now() ileri/geri — Geri sayım etkilenmez,
 * olay yazılır." F3-07'nin bulgusu: geri sayım `performance.now()` üzerine kuruludur (monoton,
 * cihaz saatinden BAĞIMSIZ), süre hesabı zaten sunucudadır — bu test Date.now() oynatıldığında
 * geri sayımın GERÇEKTEN etkilenmediğini kanıtlar. "Olay yazılır" tarafı ise TAMAMEN farklı bir
 * mekanizmadan gelir ve bu paketin bulgusudur: istemci tarafında AYRI bir "saat oynatıldı" olayı
 * YOK — `enqueueEvent`'in HER olayda damgaladığı `occurredAt` (bkz. eventQueue.ts) Date.now()'u
 * KULLANIR, bu yüzden oynatılmış bir saat bu alana sessizce yansır; olayı GERÇEKTEN üreten
 * (`CLOCK_SKEW_DETECTED`) `ClockSkewService` sunucu tarafındadır (F3-07, ilc-parent) ve
 * `clientOccurredAt`'i sunucu saatiyle karşılaştırır — bu paketin repo'su (ilc-app) olduğu için
 * sunucu tarafı burada tekrar test edilmedi (zaten `ClockSkewServiceTest`'te var).
 */
describe("Kaos 5 — saat oynatma", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("the countdown is unaffected by the wall clock jumping forward mid-exam", () => {
    // DİKKAT: `vi.useFakeTimers()` performance.now()'ı DA sahteler (F3-07'nin clock.test.ts'i
    // ile AYNI bulgu) — bu yüzden anchorClock'u fake timer AKTİFKEN çağırmak gerekir, yoksa
    // gerçek (büyük, process uptime) performance.now() değeri sahte (küçük) değerle
    // KARŞILAŞTIRILIR ve anlamsız bir negatif fark üretir.
    vi.useFakeTimers();
    const anchor = anchorClock(60_000, true);
    vi.setSystemTime(Date.now() + 3_600_000); // saat 1 saat ileri alındı, zaman İLERLETİLMEDİ
    // interpolateRemaining SADECE performance.now() okur — zaman ilerletilmediği için (yalnız
    // Date oynatıldı) performance.now() DEĞİŞMEDİ, dolayısıyla remaining AYNI kalmalı.
    const remaining = interpolateRemaining(anchor);
    expect(remaining).not.toBeNull();
    expect(remaining).toBeLessThanOrEqual(60_000);
    expect(remaining).toBeGreaterThan(59_000);
  });

  it("the countdown is unaffected by the wall clock jumping backward mid-exam", () => {
    vi.useFakeTimers();
    const anchor = anchorClock(60_000, true);
    vi.setSystemTime(Date.now() - 3_600_000); // saat 1 saat geri alındı
    const remaining = interpolateRemaining(anchor);
    expect(remaining).not.toBeNull();
    expect(remaining).toBeGreaterThan(59_000);
  });

  it("a paused countdown reports the frozen value regardless of the wall clock", () => {
    vi.useFakeTimers();
    const anchor = anchorClock(15_000, false);
    vi.setSystemTime(Date.now() + 999_999);
    expect(interpolateRemaining(anchor)).toBe(15_000);
  });

  /**
   * BULGU (bu senaryonun bu oturumda ortaya çıkardığı, görev dosyasının kendi kuralı:
   * "kırmızı test bir bulgudur, susturulacak bir şey değil" — ama burada test KIRMIZI DEĞİL,
   * çünkü beklenti baştan "istemci kendi başına bir olay üretmez" olarak yazıldı; asıl bulgu
   * DURUM.md'ye not edildi): istemci tarafında saat oynatma için AYRI bir olay YOKTUR —
   * enqueueEvent HER çağrıda Date.now()'u (oynatılmışsa oynatılmış haliyle) `occurredAt`'e
   * yazar, bu da zaten kuyruğa giren HER olayın (HEARTBEAT dahil) gövdesinde dolaylı olarak var.
   */
  it("every queued event's occurredAt reflects the tampered wall clock, so the server can observe the skew", () => {
    // DİKKAT (bu testin kendi bulgusu, üretim kodu değil): `Date.now` STATİK metodunu
    // yeniden atamak `new Date()` kurucusunu DEĞİŞTİRMEZ (ikisi motor seviyesinde ayrı giriş
    // noktası) — `enqueueEvent` `new Date().toISOString()` kullanır (bkz. eventQueue.ts),
    // bu yüzden saat oynatmayı GERÇEKTEN simüle etmek için `vi.setSystemTime` gerekir.
    const realNow = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(realNow + 3_600_000);

    enqueueEvent(APPLICATION_ID, "HEARTBEAT", {});

    const queued = readQueue(APPLICATION_ID);
    expect(queued).toHaveLength(1);
    const occurredAt = new Date(queued[0]!.occurredAt).getTime();
    expect(occurredAt).toBeGreaterThan(realNow + 3_000_000);
  });
});
