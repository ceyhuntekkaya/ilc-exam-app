import { describe, expect, it } from "vitest";

import { BLUEPRINT_DIMENSION_KINDS, type BlueprintDetail } from "@/src/features/authoring/shared/client";
import { draftsFromDetail } from "@/src/features/authoring/blueprints/BlueprintPages";

function blueprint(dimensions: BlueprintDetail["dimensions"]): BlueprintDetail {
  return {
    id: "bp-1",
    title: "B1 Achievement",
    status: "DRAFT",
    createdBy: "user-1",
    createdAt: "2026-11-04T00:00:00Z",
    dimensions,
  };
}

/**
 * H-02: görev dosyasının asıl şartı — tolerans alanına uydurma bir varsayılan YAZILMAZ. Bu test
 * o garantiyi düzenleyici (editor) taslak katmanında doğrular: `null` her zaman boş metin olarak
 * kalır, hiçbir zaman "0" veya "null" dizgesine dönüşmez.
 */
describe("draftsFromDetail", () => {
  it("tanımsız bir blueprint için dokuz boyutun hepsine boş taslak verir", () => {
    const drafts = draftsFromDetail(null);
    expect(Object.keys(drafts)).toHaveLength(BLUEPRINT_DIMENSION_KINDS.length);
    for (const kind of BLUEPRINT_DIMENSION_KINDS) {
      expect(drafts[kind]).toEqual({ targetText: "{}", tolerance: "" });
    }
  });

  it("tolerance null olan bir boyutu boş metinle taşır, '0' veya 'null' ÜRETMEZ", () => {
    const bp = blueprint([{ kind: "DURATION", target: { seconds: 3600 }, tolerance: null }]);
    const drafts = draftsFromDetail(bp);
    expect(drafts.DURATION.tolerance).toBe("");
    expect(JSON.parse(drafts.DURATION.targetText)).toEqual({ seconds: 3600 });
  });

  it("tolerance tanımlı bir boyutun sayısını metne çevirir", () => {
    const bp = blueprint([
      { kind: "SKILL_DISTRIBUTION", target: { READING: 0.25 }, tolerance: 0.05 },
    ]);
    const drafts = draftsFromDetail(bp);
    expect(drafts.SKILL_DISTRIBUTION.tolerance).toBe("0.05");
  });

  it("sunucuda tanımlı olmayan boyutlar için boş taslağı korur (diğer kind'lar etkilenmez)", () => {
    const bp = blueprint([{ kind: "DURATION", target: { seconds: 3600 }, tolerance: null }]);
    const drafts = draftsFromDetail(bp);
    expect(drafts.CEFR_TARGET).toEqual({ targetText: "{}", tolerance: "" });
  });
});
