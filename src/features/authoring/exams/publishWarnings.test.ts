import { describe, expect, it } from "vitest";
import { publishConfirmDescription } from "@/src/features/authoring/exams/publishWarnings";

const BASE = "Yayınlanan sürüm kurumlara lisanslanabilir.";

describe("publishConfirmDescription", () => {
  it("sorun yoksa metni değiştirmez", () => {
    expect(publishConfirmDescription(BASE, [])).toBe(BASE);
  });

  it("pilot madde uyarısını onay metnine katar ve yayını engellemediğini söyler", () => {
    const text = publishConfirmDescription(BASE, [
      { severity: "WARNING", path: "Sınav", message: "Bu sınavda 0 pilot madde var" },
    ]);
    expect(text).toContain("Uyarılar (1): Bu sınavda 0 pilot madde var");
    expect(text).toContain("yayını engellemez");
  });

  it("hata varsa yayının reddedileceğini ilk hata mesajıyla belirtir", () => {
    const text = publishConfirmDescription(BASE, [
      { severity: "ERROR", message: "en az 2 pilot madde gerekli" },
      { severity: "ERROR", message: "başka" },
    ]);
    expect(text).toContain("DİKKAT: 2 hata var, yayın reddedilecek: en az 2 pilot madde gerekli");
  });

  it("çok uyarıda ilk üçünü gösterir, kalanı sayar", () => {
    const warnings = Array.from({ length: 5 }, (_, i) => ({ severity: "WARNING", message: `w${i + 1}` }));
    const text = publishConfirmDescription(BASE, warnings);
    expect(text).toContain("w1 • w2 • w3");
    expect(text).not.toContain("w4 •");
    expect(text).toContain("+2 uyarı daha");
  });
});
