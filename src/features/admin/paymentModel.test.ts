import { describe, expect, it } from "vitest";
import {
  ACCOUNTING_STATUS_TABS,
  canApproveOrder,
  canRefundOrder,
  grantStatusLabel,
  grantStatusTone,
  parseAmount,
  referenceSearchFailure,
  refundOutcome,
  retryResultMessage,
  toRefundRequest,
  validateRefund,
} from "./paymentModel";

describe("muhasebe eşlemeleri", () => {
  it("bekleyen sekmesi CREATED, tümü null", () => {
    expect(ACCOUNTING_STATUS_TABS[0]).toEqual({ label: "Bekleyen", value: "CREATED" });
    expect(ACCOUNTING_STATUS_TABS.at(-1)?.value).toBeNull();
  });
  it("hak üretim durumu: DEAD vurgulu", () => {
    expect(grantStatusLabel("DEAD")).toBe("Hak ÜRETİLEMEDİ");
    expect(grantStatusTone("DEAD")).toBe("danger");
    expect(grantStatusTone("SUCCEEDED")).toBe("success");
    expect(grantStatusLabel(undefined)).toBe("—");
  });
  it("onay yalnız CREATED, iade yalnız APPROVED", () => {
    expect(canApproveOrder({ status: "CREATED" })).toBe(true);
    expect(canApproveOrder({ status: "APPROVED" })).toBe(false);
    expect(canRefundOrder({ status: "APPROVED" })).toBe(true);
    expect(canRefundOrder({ status: "REFUNDED" })).toBe(false);
  });
});

describe("iade sonucu", () => {
  it("REVOKED/NOT_GRANTED/ALREADY_REVOKED inceleme gerektirmez", () => {
    for (const e of ["REVOKED", "NOT_GRANTED", "ALREADY_REVOKED"]) expect(refundOutcome(e).needsReview).toBe(false);
  });
  it("IN_USE: geri alınmadı, elle inceleme uyarısı", () => {
    const o = refundOutcome("IN_USE");
    expect(o.needsReview).toBe(true);
    expect(o.tone).toBe("warning");
    expect(o.message).toMatch(/geri alınmadı/);
    expect(o.message).toMatch(/Elle inceleme/);
  });
  it("bilinmeyen sonuç da incelemeye işaretlenir", () => {
    expect(refundOutcome(undefined).needsReview).toBe(true);
  });
});

describe("iade formu", () => {
  it("tutarı virgül/nokta ile okur", () => {
    expect(parseAmount("450,50")).toBe(450.5);
    expect(parseAmount("450.5")).toBe(450.5);
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("12,345")).toBeNull();
  });
  it("doğrular: tutar > sipariş tutarı ve boş gerekçe reddedilir", () => {
    expect(validateRefund("500", "x", 450).amount).toMatch(/büyük olamaz/);
    expect(validateRefund("100", "  ", 450).reason).toMatch(/gerekçe/);
    expect(validateRefund("100", "Hatalı ödeme", 450)).toEqual({});
  });
  it("isteği dönüştürür", () => {
    expect(toRefundRequest("100,5", " Hatalı ödeme ")).toEqual({ amount: 100.5, reason: "Hatalı ödeme" });
    expect(toRefundRequest("0", "x")).toBeNull();
  });
});

describe("arama ve yeniden deneme mesajları", () => {
  it("400 yazım hatası, 404 sipariş yok ayrımı", () => {
    expect(referenceSearchFailure({ status: 400 })).toMatch(/yazım hatası/);
    expect(referenceSearchFailure({ status: 404 })).toMatch(/sipariş bulunamadı/);
    expect(referenceSearchFailure({ status: 500 })).toMatch(/yapılamadı/);
  });
  it("yeniden deneme sonucu", () => {
    expect(retryResultMessage({ jobId: "j", granted: true }).ok).toBe(true);
    expect(retryResultMessage({ jobId: "j", granted: false }).ok).toBe(false);
  });
});
