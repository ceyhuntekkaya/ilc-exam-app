import { describe, expect, it } from "vitest";
import { assignUnitBody, isUnitOnlyScope, validateOrgUnitId } from "./scopeModel";

const U = "11111111-2222-3333-4444-555555555555";

describe("scopeModel", () => {
  it("yalnız-birim satır: birim dolu, kampüs/sınıf/şube boş", () => {
    expect(isUnitOnlyScope({ orgUnitId: U })).toBe(true);
    expect(isUnitOnlyScope({ orgUnitId: U, branchId: "b" })).toBe(false);
    expect(isUnitOnlyScope({ orgUnitId: U, instituteId: "i" })).toBe(false);
    expect(isUnitOnlyScope({})).toBe(false);
  });
  it("birim kimliği UUID olmalı", () => {
    expect(validateOrgUnitId("")).toMatch(/zorunlu/);
    expect(validateOrgUnitId("abc")).toMatch(/UUID/);
    expect(validateOrgUnitId(` ${U} `)).toBeNull();
  });
  it("gövdede sezon seçilmediyse academicYearId gönderilmez", () => {
    expect(assignUnitBody(` ${U} `, "")).toEqual({ orgUnitId: U });
    expect(assignUnitBody(U, "y1")).toEqual({ orgUnitId: U, academicYearId: "y1" });
  });
});
