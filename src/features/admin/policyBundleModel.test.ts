import { describe, expect, it } from "vitest";
import type { BundleDto } from "@/src/api/generated/models";
import {
  FIELD_DEFS,
  emptyFieldLabels,
  isDirty,
  isFieldLocked,
  setBooleanValue,
  setValue,
  sortBundles,
  toFormState,
  toUpdateBody,
  toggleEditable,
} from "./policyBundleModel";

const VALUES: Record<string, string> = {
  SCORING_MODE: "PARTIAL_PROPORTIONAL",
  PENALTY: "true",
  OPEN_RESPONSE_GRADING_PATH: "AI_WITH_HUMAN_REVIEW",
  CERTIFICATE_ENABLED: "false",
  ATTEMPT_CONSUMPTION: "true",
  CUT_SCORE_SOURCE: "EXAM_DEFAULT",
  CALIBRATION_INCLUSION: "true",
  COMPANY_POOL_ACCESS: "true",
  ANCHOR_ACCESS: "true",
  MIN_INTEGRITY_LEVEL: "NONE",
  RESULT_VISIBILITY: "AFTER_GRADING",
  ANSWER_KEY_VISIBILITY: "NEVER",
  RETAKE_POLICY: "UNRESTRICTED",
  FEEDBACK_DEPTH: "SUMMARY",
  SUPPORTED_BROWSER_CLASS: "TAM",
};

const BUNDLE: BundleDto = {
  id: "11111111-1111-1111-1111-111111111111",
  examPurpose: "PLACEMENT",
  values: VALUES,
  companyEditableFields: ["FEEDBACK_DEPTH", "PENALTY"],
  certificateLocked: false,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("policyBundleModel", () => {
  it("tanımlı 15 alanın hepsi backend değer anahtarlarıyla örtüşür", () => {
    expect(FIELD_DEFS.map((f) => f.key).sort()).toEqual(Object.keys(VALUES).sort());
  });

  it("boolean ve enum değişiklikleri PUT gövdesine string olarak yazılır", () => {
    let state = toFormState(BUNDLE);
    state = setBooleanValue(state, "PENALTY", false);
    state = setBooleanValue(state, "ANCHOR_ACCESS", false);
    state = setValue(state, "SCORING_MODE", "ALL_OR_NOTHING");
    state = setValue(state, "RETAKE_POLICY", "  ONCE  ");
    const body = toUpdateBody(state);
    expect(body.values.PENALTY).toBe("false");
    expect(body.values.ANCHOR_ACCESS).toBe("false");
    expect(body.values.SCORING_MODE).toBe("ALL_OR_NOTHING");
    expect(body.values.RETAKE_POLICY).toBe("ONCE");
    expect(Object.values(body.values).every((v) => typeof v === "string")).toBe(true);
    expect(Object.keys(body.values)).toHaveLength(15);
  });

  it("kurum düzenlenebilir alanları alan sırasına dizer ve tekrarları atar", () => {
    let state = toFormState(BUNDLE);
    state = toggleEditable(state, "SCORING_MODE", true);
    state = toggleEditable(state, "PENALTY", false);
    state = toggleEditable(state, "SCORING_MODE", true);
    expect(toUpdateBody(state).companyEditableFields).toEqual(["SCORING_MODE", "FEEDBACK_DEPTH"]);
  });

  it("değişiklik yokken kirli değildir; değişince kirlenir", () => {
    const state = toFormState(BUNDLE);
    expect(isDirty(state, BUNDLE)).toBe(false);
    expect(isDirty(setBooleanValue(state, "PENALTY", false), BUNDLE)).toBe(true);
  });

  it("boş alan etiketlerini bildirir", () => {
    const state = setValue(toFormState(BUNDLE), "FEEDBACK_DEPTH", "   ");
    expect(emptyFieldLabels(state)).toEqual(["Geri bildirim derinliği"]);
  });

  it("CERTIFICATION demetinde yalnız CERTIFICATE_ENABLED ve PENALTY kilitlidir", () => {
    expect(isFieldLocked("CERTIFICATION", "CERTIFICATE_ENABLED")).toBe(true);
    expect(isFieldLocked("CERTIFICATION", "PENALTY")).toBe(true);
    expect(isFieldLocked("CERTIFICATION", "SCORING_MODE")).toBe(false);
    expect(isFieldLocked("PLACEMENT", "PENALTY")).toBe(false);
  });

  it("demetleri tip sırasına göre dizer", () => {
    const sorted = sortBundles([
      { id: "c", examPurpose: "CERTIFICATION" },
      { id: "a", examPurpose: "PLACEMENT" },
      { id: "b", examPurpose: "ACHIEVEMENT" },
    ]);
    expect(sorted.map((b) => b.id)).toEqual(["a", "b", "c"]);
  });
});
