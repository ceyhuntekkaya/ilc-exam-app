import { describe, expect, it } from "vitest";
import type { UnitNode } from "@/src/api/generated/models";
import { assignUnitBody, filterUnits, isUnitOnlyScope, unitLabel, validateOrgUnitChoice } from "./scopeModel";

const U = "11111111-2222-3333-4444-555555555555";

describe("scopeModel", () => {
  it("yalnız-birim satır: birim dolu, kampüs/sınıf/şube boş", () => {
    expect(isUnitOnlyScope({ orgUnitId: U })).toBe(true);
    expect(isUnitOnlyScope({ orgUnitId: U, branchId: "b" })).toBe(false);
    expect(isUnitOnlyScope({ orgUnitId: U, instituteId: "i" })).toBe(false);
    expect(isUnitOnlyScope({})).toBe(false);
  });
  it("birim seçimi zorunlu", () => {
    expect(validateOrgUnitChoice("")).toMatch(/seçin/);
    expect(validateOrgUnitChoice("  ")).toMatch(/seçin/);
    expect(validateOrgUnitChoice(U)).toBeNull();
  });
  it("birim etiketi ad yoksa kısa kimliğe düşer", () => {
    expect(unitLabel({ id: U, name: "Fen Bölümü" })).toBe("Fen Bölümü");
    expect(unitLabel({ id: U })).toBe("11111111");
  });
  it("gövdede sezon seçilmediyse academicYearId gönderilmez", () => {
    expect(assignUnitBody(` ${U} `, "")).toEqual({ orgUnitId: U });
    expect(assignUnitBody(U, "y1")).toEqual({ orgUnitId: U, academicYearId: "y1" });
  });

  describe("filterUnits", () => {
    // Ön-sıra: kök (parentId yok) > Fen > Fizik; kök > Sosyal. "x" üst birimi listede olmayan alt ağaç tepesi.
    const items: UnitNode[] = [
      { id: "r", name: "Merkez", unitType: "ROOT", depth: 0 },
      { id: "f", parentId: "r", name: "Fen Bölümü", code: "FEN", depth: 1 },
      { id: "p", parentId: "f", name: "Fizik", code: "FZK", depth: 2 },
      { id: "s", parentId: "r", name: "Sosyal", depth: 1 },
      { id: "x", name: "Kopuk Ağaç", depth: 3 },
    ];
    it("boş sorguda hepsi, sıra korunur", () => {
      expect(filterUnits(items, " ").map((r) => r.node.id)).toEqual(["r", "f", "p", "s", "x"]);
    });
    it("eşleşen birimin üst birimleri bağlam olarak kalır ve match=false işaretlenir", () => {
      const rows = filterUnits(items, "fizik");
      expect(rows.map((r) => [r.node.id, r.match])).toEqual([["r", false], ["f", false], ["p", true]]);
    });
    it("kodla ve Türkçe harf farkıyla arar; üst birimi listede olmayan birim hata vermez", () => {
      expect(filterUnits(items, "fzk").map((r) => r.node.id)).toEqual(["r", "f", "p"]);
      expect(filterUnits(items, "KOPUK AGAC").map((r) => r.node.id)).toEqual(["x"]);
      expect(filterUnits(items, "SOSYAL").map((r) => r.node.id)).toEqual(["r", "s"]);
    });
    it("döngülü parentId sonsuz döngüye girmez", () => {
      const loop: UnitNode[] = [{ id: "a", parentId: "b", name: "A" }, { id: "b", parentId: "a", name: "B" }];
      expect(filterUnits(loop, "a").map((r) => r.node.id)).toEqual(["a", "b"]);
    });
    it("eşleşme yoksa boş", () => {
      expect(filterUnits(items, "yok")).toEqual([]);
    });
  });
});
