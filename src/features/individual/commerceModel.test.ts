import { describe, expect, it } from "vitest";
import {
  createdOrderId,
  entitlementStatusLabel,
  formatMoney,
  groupIban,
  isAwaitingPayment,
  isGrantPending,
  orderFailureMessage,
  orderStatusLabel,
  orderStatusTone,
  readTransferDetails,
  toCatalogCard,
} from "./commerceModel";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe("durum rozetleri", () => {
  it("her sipariş durumuna Türkçe etiket ve ton verir", () => {
    expect(orderStatusLabel("CREATED")).toBe("Ödeme bekleniyor");
    expect(orderStatusLabel("APPROVED")).toBe("Ödeme onaylandı");
    expect(orderStatusLabel("CANCELLED")).toBe("İptal edildi");
    expect(orderStatusLabel("REFUNDED")).toBe("İade edildi");
    expect(orderStatusLabel("EXPIRED")).toBe("Süresi doldu");
    expect(orderStatusLabel("YENI")).toBe("YENI");
    expect(orderStatusTone("CREATED")).toBe("warning");
    expect(orderStatusTone("APPROVED")).toBe("success");
    expect(orderStatusTone("EXPIRED")).toBe("danger");
    expect(orderStatusTone("CANCELLED")).toBe("neutral");
  });
  it("hak durumu etiketleri", () => {
    expect(entitlementStatusLabel("NONE")).toBe("Henüz hak yok");
    expect(entitlementStatusLabel("PENDING")).toBe("Hakkınız hazırlanıyor");
    expect(entitlementStatusLabel("GRANTED")).toBe("Hakkınız tanımlandı");
  });
  it("yalnız CREATED ödeme bekler; onaylı ama hak gelmediyse hazırlanıyor sayılır", () => {
    expect(isAwaitingPayment({ status: "CREATED" })).toBe(true);
    expect(isAwaitingPayment({ status: "APPROVED" })).toBe(false);
    expect(isGrantPending({ status: "APPROVED", entitlementStatus: "PENDING" })).toBe(true);
    expect(isGrantPending({ status: "APPROVED", entitlementStatus: "GRANTED" })).toBe(false);
    expect(isGrantPending({ status: "CREATED", entitlementStatus: "NONE" })).toBe(false);
  });
});

describe("havale talimatı", () => {
  it("backend alanlarını okur; IBAN ve hesap sahibi doluysa yapılandırılmış sayar", () => {
    const d = readTransferDetails({
      providerCode: "MANUAL_TRANSFER",
      details: { iban: "TR330006100519786457841326", accountHolder: "ILC A.Ş.", bankName: "Banka", referenceCode: "ILC-123", amount: "450.00", currency: "TRY" },
    });
    expect(d).toMatchObject({ iban: "TR330006100519786457841326", referenceCode: "ILC-123", configured: true });
  });
  it("IBAN tanımsızsa yapılandırılmamış sayar; talimat yoksa null", () => {
    expect(readTransferDetails({ details: { iban: "", accountHolder: "", bankName: "", referenceCode: "X" } })?.configured).toBe(false);
    expect(readTransferDetails(undefined)).toBeNull();
  });
  it("IBAN'ı dörtlü gruplar", () => {
    expect(groupIban("TR330006100519786457841326")).toBe("TR33 0006 1005 1978 6457 8413 26");
  });
});

describe("katalog kartı", () => {
  it("ürünü kart metnine çevirir", () => {
    const card = toCatalogCard({ skuId: "s1", name: "Seviye Tespit", examPurpose: "PLACEMENT", minLevel: "A1", maxLevel: "B2", outputType: "LEVEL_REPORT", validityDays: 365, price: 450, currency: "TRY" });
    expect(card).toMatchObject({ skuId: "s1", title: "Seviye Tespit", level: "A1 – B2", output: "Seviye raporu", validity: "365 gün geçerli" });
    expect(card?.price).toContain("450");
  });
  it("kimliksiz ürünü atlar", () => {
    expect(toCatalogCard({ name: "x" })).toBeNull();
  });
  it("tutarı biçimler", () => {
    expect(formatMoney(undefined, "TRY")).toBe("—");
    expect(formatMoney(12.5, "TRY")).toContain("12,50");
  });
});

describe("sipariş oluşturma yanıtı ve hata eşlemesi", () => {
  it("order.id'yi okur", () => {
    expect(createdOrderId({ order: { id: "o-1" }, instructions: {} })).toBe("o-1");
    expect(createdOrderId({})).toBeNull();
    expect(createdOrderId(undefined)).toBeNull();
  });
  it("409 ve 400 sunucu mesajını olduğu gibi gösterir", () => {
    expect(orderFailureMessage(httpError(409, "Önceki ödemenizin hakkı henüz tanımlanmadı"))).toBe("Önceki ödemenizin hakkı henüz tanımlanmadı");
    expect(orderFailureMessage(httpError(400, "Ürün satışta değil"))).toBe("Ürün satışta değil");
  });
  it("beklenmeyen hatada genel metin", () => {
    expect(orderFailureMessage(httpError(500, "NullPointer"))).toMatch(/yeniden deneyin/);
    expect(orderFailureMessage(httpError(401, "x"))).toMatch(/Oturumunuz/);
  });
});
