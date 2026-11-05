import { describe, expect, it } from "vitest";

import { parseReliabilityBody } from "@/src/features/psychometrics/api";

/**
 * F4-02 (frontend adımı): backend `AlphaReport.alpha` yetersiz madde/örneklemde Java `Double.NaN`
 * döner ve Jackson 3 bunu gövdeye tırnaksız `NaN` olarak yazar — `JSON.parse` bunu reddeder.
 * `parseReliabilityBody` bu belirteci `null`'a çevirip ayrıştırır.
 */
describe("parseReliabilityBody", () => {
  it("sayısal NaN belirtecini null'a çevirir", () => {
    const report = parseReliabilityBody('{"alpha":NaN,"nItems":1,"nExaminees":0}');
    expect(report).toEqual({ alpha: null, nItems: 1, nExaminees: 0 });
  });

  it("geçerli bir alpha değerini olduğu gibi ayrıştırır", () => {
    const report = parseReliabilityBody('{"alpha":0.812,"nItems":12,"nExaminees":40}');
    expect(report).toEqual({ alpha: 0.812, nItems: 12, nExaminees: 40 });
  });

  it("alanlar arasında NaN geçse de diğer sayısal alanları bozmaz", () => {
    const report = parseReliabilityBody('{"nItems":2,"alpha":NaN,"nExaminees":5}');
    expect(report).toEqual({ nItems: 2, alpha: null, nExaminees: 5 });
  });
});
