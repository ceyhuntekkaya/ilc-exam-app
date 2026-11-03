import { describe, expect, it } from "vitest";
import { applyInteractionCatalog, getTemplate, TEMPLATE_REGISTRY, type ScoringMode } from "./registry";

/**
 * F2-03 sürüklenme testi: `TEMPLATE_REGISTRY`'nin kip kümesi, backend `InteractionType`'ın
 * (ilc-parent/src/main/java/com/genixo/ilc/question/InteractionType.java) elle kopyalanmış
 * aynasıyla birebir eşleşmeli. Backend'de bir tip değişirse bu test kırılır — frontend'in
 * registry.ts'i elle güncellemesi gerektiğini erkenden haber verir (gerçek drift, F1-04'ün üçüncü
 * kez bulduğu HOTSPOT_SELECT eksik PARTIAL_WITH_PENALTY, bu testin yazılma nedeni — düzeltildi).
 */
const BACKEND_INTERACTION_TYPES: Record<
  string,
  { autoGradable: boolean; requiresRubric: boolean; scoringModes: ScoringMode[] }
> = {
  MULTIPLE_CHOICE: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING"] },
  MULTIPLE_RESPONSE: {
    autoGradable: true,
    requiresRubric: false,
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL", "PARTIAL_WITH_PENALTY"],
  },
  TRUE_FALSE: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  FILL_IN_THE_BLANKS: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  SHORT_ANSWER: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  MATCHING: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  ORDERING: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  GROUPING: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  HOTSPOT_SELECT: {
    autoGradable: true,
    requiresRubric: false,
    scoringModes: ["ALL_OR_NOTHING", "PARTIAL", "PARTIAL_WITH_PENALTY"],
  },
  HOTSPOT_PLACE: { autoGradable: true, requiresRubric: false, scoringModes: ["ALL_OR_NOTHING", "PARTIAL"] },
  OPEN_ENDED: { autoGradable: false, requiresRubric: true, scoringModes: ["RUBRIC"] },
  AUDIO_RESPONSE: { autoGradable: false, requiresRubric: true, scoringModes: ["RUBRIC"] },
  VIDEO_RESPONSE: { autoGradable: false, requiresRubric: true, scoringModes: ["RUBRIC"] },
  IMAGE_RESPONSE: { autoGradable: false, requiresRubric: true, scoringModes: ["RUBRIC"] },
};

describe("TEMPLATE_REGISTRY does not drift from the backend InteractionType catalog", () => {
  it("covers exactly the 14 backend types, no more, no less", () => {
    const registryTypes = TEMPLATE_REGISTRY.map((t) => t.type).sort();
    const backendTypes = Object.keys(BACKEND_INTERACTION_TYPES).sort();
    expect(registryTypes).toEqual(backendTypes);
  });

  it.each(Object.entries(BACKEND_INTERACTION_TYPES))("%s matches the backend's allowed modes", (type, expected) => {
    const spec = getTemplate(type);
    expect(spec).toBeDefined();
    expect(spec!.autoGradable).toBe(expected.autoGradable);
    expect(spec!.requiresRubric).toBe(expected.requiresRubric);
    expect([...spec!.scoringModes].sort()).toEqual([...expected.scoringModes].sort());
  });
});

describe("applyInteractionCatalog", () => {
  it("patches scoringModes/autoGradable/requiresRubric in place without touching label/hint/defaultSkill", () => {
    const before = getTemplate("MULTIPLE_CHOICE");
    expect(before).toBeDefined();
    const originalLabel = before!.label;
    const originalHint = before!.hint;
    const originalDefaultSkill = before!.defaultSkill;

    applyInteractionCatalog([
      { type: "MULTIPLE_CHOICE", autoGradable: false, requiresRubric: true, scoringModes: ["RUBRIC"] },
    ]);

    const after = getTemplate("MULTIPLE_CHOICE");
    expect(after!.autoGradable).toBe(false);
    expect(after!.requiresRubric).toBe(true);
    expect(after!.scoringModes).toEqual(["RUBRIC"]);
    expect(after!.label).toBe(originalLabel);
    expect(after!.hint).toBe(originalHint);
    expect(after!.defaultSkill).toBe(originalDefaultSkill);

    // geri al: bu test TEMPLATE_REGISTRY'yi yerinde mutasyona uğratıyor, diğer testleri etkilemesin
    applyInteractionCatalog([
      {
        type: "MULTIPLE_CHOICE",
        autoGradable: true,
        requiresRubric: false,
        scoringModes: ["ALL_OR_NOTHING"],
      },
    ]);
  });

  it("ignores unknown types without throwing", () => {
    expect(() => applyInteractionCatalog([{ type: "NOPE", autoGradable: true, requiresRubric: false, scoringModes: [] }])).not.toThrow();
  });
});
