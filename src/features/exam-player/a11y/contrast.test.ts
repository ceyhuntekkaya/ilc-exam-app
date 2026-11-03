import { describe, expect, it } from "vitest";
import { contrastRatio, meetsNormalTextAA, meetsUiComponentAA } from "./contrast";

/**
 * F3-03/Adım 4: `exam-player-theme.css`'in (bkz. @theme bloğu) gerçek kullanılan renk
 * çiftlerinin WCAG 2.2 AA kontrastı. Bu test, bir renk değişikliği kontrastı SESSİZCE
 * bozarsa fark edilsin diye var — yalnız bir seferlik denetim değil.
 *
 * Bulgu (bu oturumda düzeltildi): `text-exam-slate-400` düz metinde (EmptySlot,
 * InteractionRenderer/QuestionView'ın "bilinmeyen tip" yedek metni) AA'yı (4.5:1) GEÇMİYORDU
 * (3.48:1) — `slate-500`'e çıkarıldı. `text-exam-slate-300` sürükleme tutamağı simgesinde
 * (dekoratif ama görme zorluğu olan kullanıcı için algılanabilirlik gerektiren bir UI
 * bileşeni, WCAG 1.4.11) 3:1'i de geçmiyordu (1.79:1) — `slate-400`'e çıkarıldı.
 */
describe("exam-player theme — WCAG 2.2 AA kontrastı", () => {
  const WHITE = "#ffffff";

  it("slate-800 (option/answer text) on white meets normal-text AA", () => {
    expect(meetsNormalTextAA("#2a2a26", WHITE)).toBe(true);
  });

  it("slate-500 (the color used for secondary/fallback text after the F3-03 fix) meets normal-text AA", () => {
    expect(meetsNormalTextAA("#6b6b63", WHITE)).toBe(true);
    // slate-400 (the PREVIOUS color) genuinely failed — locks in why the fix was needed.
    expect(meetsNormalTextAA("#8a8a82", WHITE)).toBe(false);
  });

  it("slate-400 (the color now used for the drag-handle icon after the F3-03 fix) meets the UI-component AA threshold", () => {
    expect(meetsUiComponentAA("#8a8a82", WHITE)).toBe(true);
    // slate-300 (the PREVIOUS color) genuinely failed even the relaxed UI threshold.
    expect(meetsUiComponentAA("#c2c2ba", WHITE)).toBe(false);
  });

  it("navy-900 on white (number badges, headings) meets normal-text AA", () => {
    expect(meetsNormalTextAA("#0e0e0c", WHITE)).toBe(true);
  });

  it("the ok/bad/warn banner ink-on-background pairs meet normal-text AA", () => {
    expect(meetsNormalTextAA("#0a5c2b", "#e3f3e8")).toBe(true); // exam-ok-ink / exam-ok-bg
    expect(meetsNormalTextAA("#9e0c24", "#fde8eb")).toBe(true); // exam-bad-ink / exam-bad-bg
    expect(meetsNormalTextAA("#a15c00", "#fff1db")).toBe(true); // exam-warn / exam-warn-bg
  });

  it("white on the selected/active sky-500 background meets the UI-component AA threshold", () => {
    expect(meetsUiComponentAA(WHITE, "#1f6bff")).toBe(true);
  });

  it("contrastRatio is symmetric regardless of argument order", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#000000"), 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
});
