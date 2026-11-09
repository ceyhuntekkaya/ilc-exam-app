import { describe, expect, it } from "vitest";
import type { OutcomeNode } from "@/src/api/generated/models";
import { filterTree, flattenTree, parentCandidates, subtreeIds, toMapRequest, validateMappingForm } from "@/src/features/outcome-tree/treeModel";

const TREE: OutcomeNode[] = [
  {
    id: "r1",
    framework: "MEB",
    code: "MEB.1",
    description: "Dinleme",
    children: [
      { id: "c1", framework: "MEB", code: "MEB.1.1", description: "Ana fikri bulur", parentId: "r1", children: [{ id: "g1", framework: "MEB", code: "MEB.1.1.1", description: "Detay", parentId: "c1", children: [] }] },
      { id: "c2", framework: "MEB", code: "MEB.1.2", description: "Detay yakalar", parentId: "r1", children: [] },
    ],
  },
  { id: "r2", framework: "CEFR", code: "A2.R", description: "Okuma", children: [] },
];

describe("ağaç yardımcıları", () => {
  it("düzleştirir ve alt ağaç kimliklerini verir", () => {
    expect(flattenTree(TREE).map((n) => n.id)).toEqual(["r1", "c1", "g1", "c2", "r2"]);
    expect([...subtreeIds(TREE[0].children![0])].sort()).toEqual(["c1", "g1"]);
  });
  it("üst adayları: kendisi ve torunları ile başka çerçeve hariç", () => {
    const candidates = parentCandidates(TREE, TREE[0].children![0]).map((n) => n.id);
    expect(candidates).toEqual(["r1", "c2"]);
  });
  it("süzgeç eşleşen torunun yolunu korur", () => {
    const out = filterTree(TREE, "ana fikri");
    expect(out.map((n) => n.id)).toEqual(["r1"]);
    expect(out[0].children!.map((n) => n.id)).toEqual(["c1"]);
    expect(filterTree(TREE, "yok böyle")).toEqual([]);
    expect(filterTree(TREE, "  ")).toHaveLength(2);
  });
  it("bozuk (döngülü) veride sonsuz döngüye girmez", () => {
    const loop: OutcomeNode = { id: "x", children: [] };
    loop.children = [loop];
    expect(flattenTree([loop])).toHaveLength(1);
  });
});

describe("eşleme formu", () => {
  const uuid = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";
  it("doğrular", () => {
    expect(validateMappingForm({ targetOutcomeId: uuid, mappingType: "EXACT", confidence: "" })).toEqual({});
    expect(Object.keys(validateMappingForm({ targetOutcomeId: "x", mappingType: "", confidence: "2" })).sort()).toEqual(["confidence", "mappingType", "targetOutcomeId"]);
  });
  it("isteğe çevirir; boş güven gönderilmez", () => {
    expect(toMapRequest({ targetOutcomeId: ` ${uuid} `, mappingType: "BROADER", confidence: "0,8" })).toEqual({ targetOutcomeId: uuid, mappingType: "BROADER", confidence: 0.8 });
    expect(toMapRequest({ targetOutcomeId: uuid, mappingType: "EXACT", confidence: "" })).not.toHaveProperty("confidence");
  });
});
