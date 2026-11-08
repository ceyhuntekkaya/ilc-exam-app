import { describe, expect, it } from "vitest";
import type { BundleDto } from "@/src/api/generated/models";
import {
  EMPTY_SKU_FORM,
  isCertificateOutputAllowed,
  levelRange,
  normalizeOutput,
  toSkuRequest,
  validateSkuForm,
} from "./skuModel";

const OPEN: BundleDto = { id: "b1", examPurpose: "CERTIFICATION", values: { CERTIFICATE_ENABLED: "true" } };
const CLOSED: BundleDto = { id: "b2", examPurpose: "PLACEMENT", values: { CERTIFICATE_ENABLED: "false" } };

describe("skuModel", () => {
  it("sertifika çıktısı yalnız CERTIFICATE_ENABLED=true demetle serbesttir", () => {
    expect(isCertificateOutputAllowed(OPEN)).toBe(true);
    expect(isCertificateOutputAllowed(CLOSED)).toBe(false);
    expect(isCertificateOutputAllowed(undefined)).toBe(false);
  });

  it("demet değişince geçersiz kalan CERTIFICATE çıktısı seviye raporuna döner", () => {
    expect(normalizeOutput("CERTIFICATE", CLOSED)).toBe("LEVEL_REPORT");
    expect(normalizeOutput("CERTIFICATE", OPEN)).toBe("CERTIFICATE");
    expect(normalizeOutput("LEVEL_REPORT", CLOSED)).toBe("LEVEL_REPORT");
  });

  it("form isteğe çevrilirken boş seçenekler gövdeye girmez", () => {
    const body = toSkuRequest({ ...EMPTY_SKU_FORM, code: " A1-PL ", name: "Seviye", policyBundleId: "b2", validityDays: "365" });
    expect(body).toMatchObject({ code: "A1-PL", name: "Seviye", policyBundleId: "b2", validityDays: 365, includesModule: false });
    expect(body.ageBandOptionId).toBeUndefined();
    expect(body.minLevel).toBeUndefined();
  });

  it("doğrulama: zorunlu alanlar, seviye sırası ve geçerlilik süresi", () => {
    const ok = { ...EMPTY_SKU_FORM, code: "X", name: "Y", policyBundleId: "b" };
    expect(validateSkuForm(ok)).toBeNull();
    expect(validateSkuForm({ ...ok, policyBundleId: "" })).toMatch(/demet/i);
    expect(validateSkuForm({ ...ok, minLevel: "B2", maxLevel: "A1" })).toMatch(/seviye/i);
    expect(validateSkuForm({ ...ok, validityDays: "0" })).toMatch(/pozitif/);
    expect(validateSkuForm({ ...ok, validityDays: "1.5" })).toMatch(/pozitif/);
  });

  it("seviye aralığı yazımı", () => {
    expect(levelRange({ minLevel: "A1", maxLevel: "B2" })).toBe("A1 – B2");
    expect(levelRange({ minLevel: "PRE_A1", maxLevel: "PRE_A1" })).toBe("PRE-A1");
    expect(levelRange({})).toBe("—");
  });
});
