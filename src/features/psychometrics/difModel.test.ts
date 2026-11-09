import { describe, expect, it } from "vitest";
import { computeSummaryLines, dimensionTitle, dimensionVerdict, formatStat, groupVerdict } from "@/src/features/psychometrics/difModel";

describe("groupVerdict", () => {
  it("eşik altı n yetersiz veridir, ETS düzeyi yorumlanmaz", () => {
    expect(groupVerdict({ group: "A", n: 20, sufficientData: true, etsLevel: "C" }, 30).kind).toBe("insufficient");
  });
  it("backend sufficientData=false ise eşik bilinmese de yetersiz", () => {
    expect(groupVerdict({ group: "A", n: 500, sufficientData: false, etsLevel: "A" }).kind).toBe("insufficient");
  });
  it("ETS A/B/C ayrı rozetler", () => {
    expect(groupVerdict({ n: 100, sufficientData: true, etsLevel: "A" }, 30)).toMatchObject({ kind: "no-bias", tone: "success" });
    expect(groupVerdict({ n: 100, sufficientData: true, etsLevel: "B" }, 30)).toMatchObject({ kind: "moderate", tone: "warning" });
    expect(groupVerdict({ n: 100, sufficientData: true, etsLevel: "C" }, 30)).toMatchObject({ kind: "large", tone: "danger" });
  });
  it("sınıf yoksa sınıflanmadı", () => {
    expect(groupVerdict({ n: 100, sufficientData: true }, 30).kind).toBe("unknown");
  });
});

describe("dimensionVerdict", () => {
  it("veri yok, hesaplanmadı ve yanlılık yok ayrı durumlardır", () => {
    expect(dimensionVerdict({ key: "AGE_BAND", status: "NO_DATA" }).kind).toBe("no-data");
    expect(dimensionVerdict({ key: "AGE_BAND", status: "NOT_COMPUTED", note: "x" }).kind).toBe("not-computed");
    expect(
      dimensionVerdict({ key: "AGE_BAND", status: "COMPUTED", groups: [{ group: "g", n: 90, sufficientData: true, etsLevel: "A" }] }, 30).kind,
    ).toBe("no-bias");
  });
  it("hesaplandı ama grup yoksa 'yanlılık yok' DENMEZ", () => {
    expect(dimensionVerdict({ key: "AGE_BAND", status: "COMPUTED", groups: [] }).kind).toBe("no-data");
  });
  it("tüm gruplar yetersizse boyut yetersiz veridir", () => {
    const dim = { key: "NATIVE_LANGUAGE", status: "COMPUTED", groups: [{ group: "tr", n: 5, sufficientData: false }] };
    expect(dimensionVerdict(dim, 30).kind).toBe("insufficient");
  });
  it("yetersiz grup, yeterli A grubunu gölgelemez ama C öne çıkar", () => {
    const dim = {
      key: "AGE_BAND",
      status: "COMPUTED",
      groups: [
        { group: "a", n: 5, sufficientData: false },
        { group: "b", n: 99, sufficientData: true, etsLevel: "A" },
        { group: "c", n: 99, sufficientData: true, etsLevel: "C" },
      ],
    };
    expect(dimensionVerdict(dim, 30).kind).toBe("large");
  });
});

describe("yardımcılar", () => {
  it("başlık etiketi yoksa anahtara düşer", () => {
    expect(dimensionTitle({ key: "INSTITUTION_TYPE" })).toBe("Kurum türü");
    expect(dimensionTitle({ key: "X", label: "Özel" })).toBe("Özel");
  });
  it("sayı biçimi", () => {
    expect(formatStat(undefined)).toBe("—");
    expect(formatStat(1.23456)).toBe("1.235");
  });
  it("hesap özeti dışlananları listeler", () => {
    const lines = computeSummaryLines({ summary: { usedCentral: 10, usedClientProctored: 4, excluded: { NO_PROCTOR: 2, X: 0 } } });
    expect(lines).toHaveLength(3);
    expect(lines[2]).toContain("NO_PROCTOR");
  });
});
