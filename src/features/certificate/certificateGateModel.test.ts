import { describe, expect, it } from "vitest";
import {
  approvalFailureMessage,
  approvalProgress,
  approverLabel,
  bundleConditionsLabel,
  canGiveApproval,
  conditionLabel,
  conditionState,
  gateVerdict,
  missingConditions,
  readinessRows,
  validateNote,
  type ReadinessReport,
} from "@/src/features/certificate/certificateGateModel";

describe("onay durumu", () => {
  it("ilerleme: kaç farklı onay", () => {
    expect(approvalProgress({ requiredApprovals: 2, distinctApprovers: 1 })).toEqual({ text: "1/2 farklı onay", complete: false });
    expect(approvalProgress({ requiredApprovals: 2, distinctApprovers: 2 }).complete).toBe(true);
  });
  it("bundleConditionsMet 'kapı açık' DEĞİLDİR: etiket yalnız demet koşullarını söyler", () => {
    const label = bundleConditionsLabel({ certificateEnabledFlag: true, bundleConditionsMet: true });
    expect(label.label).toMatch(/Demet koşulları/);
    expect(label.label).not.toMatch(/kapı/i);
    expect(bundleConditionsLabel({ certificateEnabledFlag: false, bundleConditionsMet: false }).label).toMatch(/bayrağı kapalı/);
    expect(bundleConditionsLabel({ certificateEnabledFlag: true, bundleConditionsMet: false }).tone).toBe("warning");
  });
  it("onay verme: bayrak açık, iki onay dolmadı, kullanıcı daha önce onaylamadı", () => {
    const base = { certificateEnabledFlag: true, requiredApprovals: 2, distinctApprovers: 1, approvals: [{ approvedBy: "u1" }] };
    expect(canGiveApproval(base, "u2")).toBe(true);
    expect(canGiveApproval(base, "u1")).toBe(false);
    expect(canGiveApproval({ ...base, distinctApprovers: 2 }, "u3")).toBe(false);
    expect(canGiveApproval({ ...base, certificateEnabledFlag: false }, "u2")).toBe(false);
  });
  it("onaylayan: kendiniz 'Siz', diğeri kısa kimlik", () => {
    expect(approverLabel({ approvedBy: "u1" }, "u1")).toBe("Siz");
    expect(approverLabel({ approvedBy: "0190a1b2-c3d4" }, "u1")).toBe("Kullanıcı 0190a1b2");
    expect(approverLabel({}, "u1")).toBe("—");
  });
  it("not ve hata mesajları", () => {
    expect(validateNote("x".repeat(501))).toMatch(/500/);
    expect(validateNote("")).toBeNull();
    expect(approvalFailureMessage(Object.assign(new Error("Bu kullanıcı bu demet için zaten onay verdi"), { status: 409 }))).toMatch(/zaten onay/);
    expect(approvalFailureMessage(Object.assign(new Error("Yetki yok"), { status: 403 }))).toBe("Yetki yok");
    expect(approvalFailureMessage("?")).toBe("Onay kaydedilemedi");
  });
});

const CLOSED: ReadinessReport = {
  ready: false,
  conditions: [
    { name: "CALIBRATED_ITEM_RATIO", thresholdDefined: false, met: false, detail: "Eşik tanımsız" },
    { name: "ITEM_FIT", thresholdDefined: false, met: false, detail: "Veri kaynağı yok" },
    { name: "STANDARD_SETTING_COMPLETE", thresholdDefined: true, met: false },
    { name: "DIF_FLAGS", thresholdDefined: false, met: false },
    { name: "EQUATING_ASSURANCE", thresholdDefined: true, met: true },
  ],
  scope: { scoredItemCount: 30 },
  inputs: { calibratedItemRatio: 0, misfittingItemRatio: null, standardSettingComplete: false, difLevelCCount: null, achievedAssuranceLevel: "UNVERIFIED" },
  thresholds: { minCalibratedItemRatio: null, maxMisfittingItemRatio: null, maxDifLevelCCount: null, minDifCoverageRatio: null, minimumAssuranceLevel: "BLUEPRINT_STRICT" },
  notes: { ITEM_FIT: "ITEM_FIT için veri kaynağı yok" },
};

describe("kapı hazırlık raporu", () => {
  it("koşullar karşılanmadıkça KAPALI; boş koşul listesi açık sayılmaz", () => {
    expect(gateVerdict(CLOSED)).toMatchObject({ open: false, label: "Sertifika kapısı KAPALI", tone: "danger" });
    expect(gateVerdict({ ready: true, conditions: [] }).open).toBe(false);
    expect(gateVerdict({ ready: true, conditions: [{ name: "A", thresholdDefined: true, met: true }] }).open).toBe(true);
    // ready=true ama bir koşul karşılanmamışsa yine kapalı (savunma).
    expect(gateVerdict({ ready: true, conditions: [{ name: "A", thresholdDefined: true, met: false }] }).open).toBe(false);
  });
  it("koşul durumu: eşik tanımsız / karşılandı / karşılanmadı ayrı", () => {
    expect(conditionState({ thresholdDefined: false, met: false }).label).toBe("Eşik tanımsız");
    expect(conditionState({ thresholdDefined: true, met: true }).label).toBe("Karşılandı");
    expect(conditionState({ thresholdDefined: true, met: false }).label).toBe("Karşılanmadı");
    expect(conditionLabel("ITEM_FIT")).toMatch(/item fit/);
    expect(missingConditions(CLOSED).map((c) => c.name)).toHaveLength(4);
  });
  it("okunamayan değer 0 gibi gösterilmez; tanımsız eşik 'tanımsız'", () => {
    const rows = readinessRows(CLOSED);
    const fit = rows.find((r) => r.name === "ITEM_FIT")!;
    expect(fit.value).toBe("—");
    expect(fit.threshold).toBe("tanımsız");
    expect(fit.note).toMatch(/veri kaynağı yok/);
    expect(rows.find((r) => r.name === "CALIBRATED_ITEM_RATIO")!.value).toBe("%0");
    expect(rows.find((r) => r.name === "DIF_FLAGS")!.value).toBe("—");
    expect(rows.find((r) => r.name === "EQUATING_ASSURANCE")!.threshold).toBe("BLUEPRINT_STRICT");
  });
});
