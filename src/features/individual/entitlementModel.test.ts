import { describe, expect, it } from "vitest";
import {
  entitlementsFailure,
  examPathForRecipient,
  openAttemptFailureMessage,
  openedExamPath,
  toEntitlementCard,
  validityText,
} from "@/src/features/individual/entitlementModel";

const NOW = new Date("2026-11-09T12:00:00Z");
const base = { skuId: "sku-1", skuName: "Seviye Tespit", total: 3, available: 2, validUntil: "2027-06-01T00:00:00Z" };

describe("toEntitlementCard", () => {
  it("kullanılabilir hak: başlat eylemi, kalan sayısı ve kullanılan", () => {
    const card = toEntitlementCard(base, NOW)!;
    expect(card).toMatchObject({ title: "Seviye Tespit", total: 3, available: 2, used: 1, action: "start", expired: false });
    expect(card.status).toEqual({ label: "2 hak kaldı", tone: "success" });
  });
  it("açık deneme varsa yeni hak harcanmaz: devam et", () => {
    const card = toEntitlementCard({ ...base, openRecipientId: "rec-9" }, NOW)!;
    expect(card.action).toBe("resume");
    expect(card.openRecipientId).toBe("rec-9");
  });
  it("hak kalmadıysa eylem yok", () => {
    const card = toEntitlementCard({ ...base, available: 0 }, NOW)!;
    expect(card.action).toBe("none");
    expect(card.status.label).toBe("Hak kullanıldı");
  });
  it("süresi dolmuş hak başlatılamaz (açık deneme olsa bile devam yok)", () => {
    const card = toEntitlementCard({ ...base, validUntil: "2026-01-01T00:00:00Z", openRecipientId: "rec-9" }, NOW)!;
    expect(card).toMatchObject({ expired: true, action: "none" });
    expect(card.status.label).toBe("Süresi doldu");
  });
  it("süresiz hak (validUntil yok) süresi dolmuş sayılmaz; skuId yoksa kart yok; ad yoksa kod", () => {
    expect(toEntitlementCard({ ...base, validUntil: undefined }, NOW)!.expired).toBe(false);
    expect(toEntitlementCard({ total: 1 }, NOW)).toBeNull();
    expect(toEntitlementCard({ skuId: "x", skuCode: "PLC-1", total: 1, available: 1 }, NOW)!.title).toBe("PLC-1");
  });
});

describe("geçerlilik metni", () => {
  it("süresiz / geçerli / sona erdi", () => {
    expect(validityText({ validUntil: null, expired: false })).toBe("Süresiz geçerli");
    expect(validityText({ validUntil: "2027-06-01T00:00:00Z", expired: false })).toMatch(/kadar geçerli/);
    expect(validityText({ validUntil: "2026-01-01T00:00:00Z", expired: true })).toMatch(/sona erdi/);
  });
});

describe("yönlendirme", () => {
  it("açılan alıcı mevcut öğrenci sınav akışına gider", () => {
    expect(examPathForRecipient("rec-1")).toBe("/student/exams/rec-1");
    expect(openedExamPath({ recipientId: "rec-1" })).toBe("/student/exams/rec-1");
    expect(openedExamPath({})).toBeNull();
    expect(openedExamPath(undefined)).toBeNull();
  });
});

describe("hata mesajları", () => {
  it("409/400/403 sunucu mesajını aynen verir", () => {
    const conflict = Object.assign(new Error("Sonuç bekleniyor: önceki denemenizin sonucu yayınlanmadan yeni deneme açılamaz"), { status: 409 });
    expect(openAttemptFailureMessage(conflict)).toBe("Sonuç bekleniyor: önceki denemenizin sonucu yayınlanmadan yeni deneme açılamaz");
    expect(openAttemptFailureMessage(Object.assign(new Error("Tekrar politikası reddetti: x"), { status: 400 }))).toBe("Tekrar politikası reddetti: x");
  });
  it("401, 404 ve bilinmeyen hata için Türkçe yedek metin", () => {
    expect(openAttemptFailureMessage(Object.assign(new Error("x"), { status: 401 }))).toMatch(/Oturumunuz/);
    expect(openAttemptFailureMessage(Object.assign(new Error("x"), { status: 404 }))).toMatch(/bulunamadı/);
    expect(openAttemptFailureMessage(new Error("boom"))).toMatch(/başlatılamadı/);
  });
  it("kurumsal öğrencide 400 'Yalnızca bireysel aday' hata değil açıklamadır", () => {
    expect(entitlementsFailure(Object.assign(new Error("Yalnızca bireysel aday"), { status: 400 }))).toEqual({ message: "Yalnızca bireysel aday", individualOnly: true });
    expect(entitlementsFailure(Object.assign(new Error("x"), { status: 500 })).individualOnly).toBe(false);
  });
});
