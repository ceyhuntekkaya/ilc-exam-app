import { describe, expect, it } from "vitest";
import {
  anchorActions,
  anchorItemsEditable,
  anchorStatusLabel,
  bandPairLabel,
  selfApprovalWarning,
  validateAnchorForm,
} from "@/src/features/psychometrics/anchor/anchorModel";

describe("anchorActions", () => {
  it("durum akışına göre geçişler", () => {
    expect(anchorActions("DRAFT").map((a) => a.action)).toEqual(["submit-review"]);
    expect(anchorActions("IN_REVIEW").map((a) => a.action)).toEqual(["approve", "return-to-draft"]);
    expect(anchorActions("APPROVED").map((a) => a.action)).toEqual(["retire", "return-to-draft"]);
    expect(anchorActions("RETIRED").map((a) => a.action)).toEqual(["republish"]);
    expect(anchorActions("?")).toEqual([]);
  });
  it("madde düzenleme yalnız taslakta", () => {
    expect(anchorItemsEditable("DRAFT")).toBe(true);
    expect(anchorItemsEditable("IN_REVIEW")).toBe(false);
    expect(anchorItemsEditable("APPROVED")).toBe(false);
  });
});

describe("validateAnchorForm", () => {
  it("bant çifti artan olmalı", () => {
    expect(validateAnchorForm({ bandFrom: "B1", bandTo: "A2", period: "2026-H1" }).bandTo).toMatch(/yüksek/);
    expect(validateAnchorForm({ bandFrom: "B1", bandTo: "B1", period: "2026-H1" }).bandTo).toBeDefined();
    expect(validateAnchorForm({ bandFrom: "A2", bandTo: "B1", period: "2026-H1" })).toEqual({});
  });
  it("dönem zorunlu, bant seçilmeli", () => {
    const errors = validateAnchorForm({ bandFrom: "", bandTo: "", period: " " });
    expect(Object.keys(errors).sort()).toEqual(["bandFrom", "bandTo", "period"]);
  });
});

describe("etiketler ve dört göz", () => {
  it("etiketler", () => {
    expect(anchorStatusLabel("IN_REVIEW")).toBe("İncelemede");
    expect(bandPairLabel({ bandFrom: "PRE_A1", bandTo: "A1" })).toBe("Pre-A1 → A1");
  });
  it("yazar kendi setini onaylayamaz uyarısı; süper admin hariç", () => {
    const set = { status: "IN_REVIEW", createdBy: "u1" };
    expect(selfApprovalWarning(set, "u1")).toMatch(/dört göz/);
    expect(selfApprovalWarning(set, "u2")).toBeNull();
    expect(selfApprovalWarning(set, "u1", true)).toBeNull();
    expect(selfApprovalWarning({ status: "DRAFT", createdBy: "u1" }, "u1")).toBeNull();
  });
});
