import { describe, expect, it } from "vitest";
import { formatDay, reviewRequestFailureMessage, toCertificateView, validateReviewReason } from "@/src/features/portal/certificateModel";

const NOW = new Date("2026-11-09T12:00:00Z");

describe("toCertificateView", () => {
  it("kapı kapalıyken (available=false) hata değil 'yok' durumudur", () => {
    expect(toCertificateView({ available: false, message: "Bu sonuç için sertifika yok, seviye raporu kullanılabilir", levelReportUrl: "/report/me/results/x/pdf" }, "", NOW)).toEqual({ kind: "none" });
    expect(toCertificateView(undefined, "", NOW)).toEqual({ kind: "none" });
    expect(toCertificateView(null, "", NOW)).toEqual({ kind: "none" });
  });
  it("kod olmadan 'var' denmez", () => {
    expect(toCertificateView({ available: true }, "", NOW)).toEqual({ kind: "none" });
  });
  it("düzenlenmiş sertifika: kod, tarihler, doğrulama yolu ve sunucunun tam bağlantısı", () => {
    const view = toCertificateView(
      { available: true, certificateCode: "ILC-ABC 123", issuedAt: "2026-10-01T00:00:00Z", validUntil: "2028-10-01T00:00:00Z", verificationUrl: "https://app.example/verify/ILC-ABC 123" },
      "https://site.example",
      NOW,
    );
    expect(view).toMatchObject({ kind: "issued", code: "ILC-ABC 123", expired: false, verifyPath: "/verify/ILC-ABC%20123", shareUrl: "https://app.example/verify/ILC-ABC 123" });
  });
  it("sunucu bağlantısı yoksa bu sitenin doğrulama yolu; süresi dolmuşsa işaretlenir", () => {
    const view = toCertificateView({ available: true, certificateCode: "C1", validUntil: "2026-01-01T00:00:00Z" }, "https://site.example", NOW);
    expect(view).toMatchObject({ kind: "issued", expired: true, shareUrl: "https://site.example/verify/C1" });
  });
});

describe("yardımcılar", () => {
  it("tarih biçimi: geçersiz/boş için tire", () => {
    expect(formatDay(undefined)).toBe("—");
    expect(formatDay("bozuk")).toBe("—");
    expect(formatDay("2026-10-01T00:00:00Z")).toMatch(/2026/);
  });
  it("gerekçe doğrulaması", () => {
    expect(validateReviewReason("   ")).toMatch(/gerekçe/i);
    expect(validateReviewReason("Puanlama hatası var")).toBeNull();
    expect(validateReviewReason("x".repeat(1001))).toMatch(/en fazla/);
  });
  it("inceleme talebi hataları: 409 sunucu mesajıyla; 404/401/diğer Türkçe yedek", () => {
    expect(reviewRequestFailureMessage(Object.assign(new Error("İtiraz süresi doldu: 2026-12-01T00:00:00Z"), { status: 409 }))).toBe("İtiraz süresi doldu: 2026-12-01T00:00:00Z");
    expect(reviewRequestFailureMessage(Object.assign(new Error("Bu sonuç için zaten bir inceleme talebi açılmış"), { status: 409 }))).toMatch(/zaten/);
    expect(reviewRequestFailureMessage(Object.assign(new Error("x"), { status: 404 }))).toMatch(/bulunamadı/);
    expect(reviewRequestFailureMessage(Object.assign(new Error("x"), { status: 401 }))).toMatch(/Oturumunuz/);
    expect(reviewRequestFailureMessage(new Error("boom"))).toMatch(/iletilemedi/);
  });
});
