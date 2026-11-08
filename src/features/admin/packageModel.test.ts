import { describe, expect, it } from "vitest";
import type { PackageDto, SkuDto } from "@/src/api/generated/models";
import {
  EMPTY_PURCHASE_FORM,
  activeSkus,
  balanceHint,
  balanceState,
  emptyPackageForm,
  newIdempotencyKey,
  packageStatusTone,
  packageToForm,
  toPackageRequest,
  toPurchaseRequest,
  validatePackageForm,
  validatePurchaseForm,
  validityRange,
  type PackageFormState,
} from "./packageModel";

const BASE: PackageFormState = {
  skuId: "sku-1",
  scope: "COMPANY",
  orgUnitId: "",
  quota: "100",
  validFrom: "2026-01-01",
  validUntil: "2026-12-31",
  overagePolicy: "HARD_STOP",
  flexAllowance: "",
};

describe("toPackageRequest", () => {
  it("HARD_STOP: flexAllowance gönderilmez, birim yok", () => {
    const req = toPackageRequest({ ...BASE, flexAllowance: "5", orgUnitId: "ignored" });
    expect(req).toMatchObject({ skuId: "sku-1", scope: "COMPANY", quota: 100, overagePolicy: "HARD_STOP" });
    expect(req.flexAllowance).toBeUndefined();
    expect(req.orgUnitId).toBeUndefined();
  });

  it("FLEX: flexAllowance sayı olarak gider", () => {
    expect(toPackageRequest({ ...BASE, overagePolicy: "FLEX", flexAllowance: "10" }).flexAllowance).toBe(10);
  });

  it("ORG_UNIT: birim kimliği kırpılarak gider", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(toPackageRequest({ ...BASE, scope: "ORG_UNIT", orgUnitId: ` ${id} ` }).orgUnitId).toBe(id);
  });
});

describe("validatePackageForm", () => {
  it("geçerli formu kabul eder", () => {
    expect(validatePackageForm(BASE)).toBeNull();
  });

  it("SKU, kota ve tarihleri doğrular", () => {
    expect(validatePackageForm({ ...BASE, skuId: "" })).toMatch(/SKU/);
    expect(validatePackageForm({ ...BASE, quota: "0" })).toMatch(/Kota/);
    expect(validatePackageForm({ ...BASE, quota: "1.5" })).toMatch(/Kota/);
    expect(validatePackageForm({ ...BASE, validUntil: "2025-01-01" })).toMatch(/Bitiş/);
  });

  it("FLEX aşım payı ister; HARD_STOP istemez", () => {
    expect(validatePackageForm({ ...BASE, overagePolicy: "FLEX", flexAllowance: "" })).toMatch(/Esnek/);
    expect(validatePackageForm({ ...BASE, overagePolicy: "FLEX", flexAllowance: "-1" })).toMatch(/Esnek/);
    expect(validatePackageForm({ ...BASE, overagePolicy: "FLEX", flexAllowance: "0" })).toBeNull();
    expect(validatePackageForm({ ...BASE, overagePolicy: "HARD_STOP", flexAllowance: "" })).toBeNull();
  });

  it("ORG_UNIT geçerli UUID ister", () => {
    expect(validatePackageForm({ ...BASE, scope: "ORG_UNIT", orgUnitId: "abc" })).toMatch(/UUID/);
    expect(validatePackageForm({ ...BASE, scope: "ORG_UNIT", orgUnitId: "11111111-2222-3333-4444-555555555555" })).toBeNull();
  });
});

describe("form varsayılanları", () => {
  it("bugünden bir yıl geçerli, kurum geneli, sert durdurma", () => {
    const form = emptyPackageForm(new Date("2026-03-10T10:00:00Z"));
    expect(form).toMatchObject({ scope: "COMPANY", overagePolicy: "HARD_STOP", validFrom: "2026-03-10", validUntil: "2027-03-10" });
  });

  it("paketten forma ve geri dönüşümlü", () => {
    const pkg: PackageDto = { skuId: "s", scope: "COMPANY", quota: 50, validFrom: "2026-01-01", validUntil: "2026-02-01", overagePolicy: "FLEX", flexAllowance: 3 };
    const form = packageToForm(pkg);
    expect(form).toMatchObject({ quota: "50", flexAllowance: "3", overagePolicy: "FLEX" });
    expect(toPackageRequest(form)).toMatchObject({ quota: 50, flexAllowance: 3 });
  });
});

describe("balanceState", () => {
  it("aktif ve bakiye var: uyarı yok", () => {
    const s = balanceState({ status: "ACTIVE", total: 100, available: 40 });
    expect(s).toEqual({ kind: "ok", text: "40 / 100 kalan", warning: false });
    expect(balanceHint(s)).toBeNull();
  });

  it("aktif ama kalan 0: tükendi uyarısı", () => {
    const s = balanceState({ status: "ACTIVE", total: 100, available: 0 });
    expect(s.kind).toBe("exhausted");
    expect(s.warning).toBe(true);
    expect(balanceHint(s)).toBe("Bakiye tükendi");
  });

  it("EXPIRED/CANCELLED: bakiye olsa da uyarı", () => {
    expect(balanceState({ status: "EXPIRED", total: 10, available: 4 })).toMatchObject({ kind: "inactive", warning: true });
    expect(balanceState({ status: "CANCELLED", total: 10, available: 4 })).toMatchObject({ kind: "inactive", warning: true });
  });

  it("negatif ya da eksik bakiye 0 gösterilir", () => {
    expect(balanceState({ status: "ACTIVE", total: 5, available: -2 }).text).toBe("0 / 5 kalan");
    expect(balanceState({ status: "ACTIVE" }).text).toBe("0 / 0 kalan");
  });
});

describe("purchase", () => {
  it("pozitif tam sayı ister", () => {
    expect(validatePurchaseForm({ ...EMPTY_PURCHASE_FORM, amount: "" })).not.toBeNull();
    expect(validatePurchaseForm({ ...EMPTY_PURCHASE_FORM, amount: "0" })).not.toBeNull();
    expect(validatePurchaseForm({ ...EMPTY_PURCHASE_FORM, amount: "-3" })).not.toBeNull();
    expect(validatePurchaseForm({ ...EMPTY_PURCHASE_FORM, amount: "2.5" })).not.toBeNull();
    expect(validatePurchaseForm({ ...EMPTY_PURCHASE_FORM, amount: "25" })).toBeNull();
  });

  it("isteği anahtarla kurar; boş referans gönderilmez", () => {
    expect(toPurchaseRequest({ amount: "25", reference: "  " }, "k-1")).toEqual({ amount: 25, reference: undefined, idempotencyKey: "k-1" });
    expect(toPurchaseRequest({ amount: "25", reference: " FTR-1 " }, "k-1").reference).toBe("FTR-1");
  });

  it("her çağrıda farklı anahtar üretir", () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});

describe("etiketler ve süzme", () => {
  it("yalnız ACTIVE SKU'lar", () => {
    const skus: SkuDto[] = [
      { id: "1", status: "ACTIVE" },
      { id: "2", status: "DRAFT" },
      { id: "3", status: "RETIRED" },
    ] as SkuDto[];
    expect(activeSkus(skus).map((s) => s.id)).toEqual(["1"]);
  });

  it("durum tonu ve geçerlilik aralığı", () => {
    expect(packageStatusTone("ACTIVE")).toBe("success");
    expect(packageStatusTone("EXPIRED")).toBe("warning");
    expect(packageStatusTone("CANCELLED")).toBe("danger");
    expect(validityRange({ validFrom: "2026-01-01", validUntil: "2026-12-31" })).toBe("01.01.2026 – 31.12.2026");
  });
});
