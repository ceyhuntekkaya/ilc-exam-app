import { describe, expect, it } from "vitest";
import {
  certificateFailure,
  certificateStatusLabel,
  certificateStatusTone,
  isActiveCertificate,
  localeLabel,
  pageCount,
  toIssueRequest,
  toReissueRequest,
  validateIssue,
  validateReason,
} from "@/src/features/certificate/certificateModel";

const UUID = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";

describe("durum ve etiketler", () => {
  it("ISSUED geçerli, REVOKED iptal", () => {
    expect(certificateStatusLabel("ISSUED")).toBe("Geçerli");
    expect(certificateStatusLabel("REVOKED")).toBe("İptal edildi");
    expect(certificateStatusLabel(undefined)).toBe("—");
    expect(certificateStatusTone("ISSUED")).toBe("success");
    expect(certificateStatusTone("REVOKED")).toBe("danger");
    expect(localeLabel("tr")).toBe("Türkçe");
    expect(localeLabel("en")).toBe("İngilizce");
  });
  it("yalnız iptal edilmemiş ISSUED sertifika işlem görür", () => {
    expect(isActiveCertificate({ status: "ISSUED" })).toBe(true);
    expect(isActiveCertificate({ status: "ISSUED", revokedAt: "2026-11-01T00:00:00Z" })).toBe(false);
    expect(isActiveCertificate({ status: "REVOKED" })).toBe(false);
  });
});

describe("basım formu", () => {
  it("iki UUID ve dil zorunlu", () => {
    expect(validateIssue({ applicationResultId: UUID, skuId: UUID, locale: "tr" })).toEqual({});
    expect(Object.keys(validateIssue({ applicationResultId: "x", skuId: "", locale: "de" })).sort()).toEqual(["applicationResultId", "locale", "skuId"]);
  });
  it("istek gövdeleri kırpılır", () => {
    expect(toIssueRequest({ applicationResultId: ` ${UUID} `, skuId: UUID, locale: "en" })).toEqual({ applicationResultId: UUID, skuId: UUID, locale: "en" });
    expect(toReissueRequest("  hatalı basım ", ` ${UUID}`, "tr")).toEqual({ reason: "hatalı basım", skuId: UUID, locale: "tr" });
  });
  it("iptal gerekçesi zorunlu ve en çok 500 karakter", () => {
    expect(validateReason("  ")).toMatch(/zorunlu/);
    expect(validateReason("x".repeat(501))).toMatch(/500/);
    expect(validateReason("Hatalı basım")).toBeNull();
  });
});

describe("hata eşlemesi", () => {
  it("409 (kapı kapalı) çok satırlı sunucu mesajını AYNEN verir", () => {
    const message = "Sertifika kapısı kapalı:\n- CALIBRATED_ITEM_RATIO: eşik tanımsız\n- STANDARD_SETTING_COMPLETE: iki onaylı kesme yok";
    expect(certificateFailure(Object.assign(new Error(message), { status: 409 }))).toEqual({ message, conflict: true });
  });
  it("409 mesajı boşsa genel metin; 403 kapsam/yetki; 400 doğrulama sunucu metniyle", () => {
    expect(certificateFailure(Object.assign(new Error(""), { status: 409 })).conflict).toBe(true);
    expect(certificateFailure(Object.assign(new Error("Yetki yok: certificate:manage"), { status: 403 }))).toEqual({ message: "Yetki yok: certificate:manage", conflict: false });
    expect(certificateFailure(Object.assign(new Error(""), { status: 403 })).message).toMatch(/yetkiniz/);
    expect(certificateFailure(Object.assign(new Error("Desteklenen sertifika dilleri: [tr, en]"), { status: 400 })).message).toMatch(/dilleri/);
    expect(certificateFailure("?", "Sertifika basılamadı").message).toBe("Sertifika basılamadı");
  });
  it("sayfa sayısı", () => {
    expect(pageCount(0, 20)).toBe(1);
    expect(pageCount(41, 20)).toBe(3);
  });
});
