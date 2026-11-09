import { describe, expect, it } from "vitest";
import { fitCell, fitStatusView, formatMnsq, modelLabel, pageSummary, sampleText, validateQuestionVersionId } from "./itemFitModel";

describe("fitStatusView", () => {
  it("AVAILABLE + değerler → 'Hesaplandı' (uyumlu DEĞİL); hüküm içermez", () => {
    const v = fitStatusView({ status: "AVAILABLE", infitMnsq: 0.98, outfitMnsq: 1.12 });
    expect(v.kind).toBe("available");
    expect(v.label).toBe("Hesaplandı");
    expect(v.label).not.toMatch(/uyumlu/i);
  });
  it("SUPPRESSED_SMALL_SAMPLE ve NOT_COMPUTED ayrı rozetler; 'bilinmiyor' ≠ 'uyumlu'", () => {
    const s = fitStatusView({ status: "SUPPRESSED_SMALL_SAMPLE" });
    const n = fitStatusView({ status: "NOT_COMPUTED" });
    expect(s.kind).toBe("suppressed");
    expect(n.kind).toBe("unknown");
    expect(s.label).not.toBe(n.label);
    expect(n.label).toMatch(/bilinmiyor/);
    expect(n.hint).toMatch(/uyumlu anlamına gelmez/);
  });
  it("AVAILABLE ama değer yoksa (tutarsız veri) bilinmiyor sayılır", () => {
    expect(fitStatusView({ status: "AVAILABLE", infitMnsq: undefined, outfitMnsq: 1 }).kind).toBe("unknown");
    expect(fitStatusView({ status: undefined }).kind).toBe("unknown");
  });
});

describe("fitCell / formatMnsq", () => {
  it("yalnız AVAILABLE iken sayı gösterir; bastırılmış satırda değer gelse bile gizlenir", () => {
    expect(fitCell({ status: "AVAILABLE", infitMnsq: 0.9, outfitMnsq: 1.3 }, "outfitMnsq")).toBe("1,30");
    expect(fitCell({ status: "SUPPRESSED_SMALL_SAMPLE", infitMnsq: 0.9, outfitMnsq: 1.3 }, "infitMnsq")).toBe("—");
    expect(fitCell({ status: "NOT_COMPUTED" }, "infitMnsq")).toBe("—");
    expect(formatMnsq(NaN)).toBeNull();
    expect(formatMnsq(null)).toBeNull();
    expect(formatMnsq(0)).toBe("0,00");
  });
});

describe("yardımcılar", () => {
  it("model etiketi, örneklem, sayfa özeti, UUID doğrulaması", () => {
    expect(modelLabel("TWO_PL")).toBe("2PL");
    expect(modelLabel(undefined)).toBe("—");
    expect(sampleText({ fitSampleSize: undefined, calibrationSampleSize: 1200 })).toEqual({ fit: "—", calibration: "1.200" });
    expect(pageSummary(1, 50, 120)).toBe("51–100 / 120");
    expect(pageSummary(0, 50, 0)).toBe("0 madde");
    expect(validateQuestionVersionId("")).toMatch(/girin/);
    expect(validateQuestionVersionId("abc")).toMatch(/UUID/);
    expect(validateQuestionVersionId("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b")).toBeNull();
  });
});
