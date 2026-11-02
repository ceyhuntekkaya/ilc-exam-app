import { describe, expect, it } from "vitest";
import { resolveUiLocale } from "./locale";

describe("resolveUiLocale", () => {
  it("prefers the user's own locale", () => {
    expect(resolveUiLocale("en", "tr")).toBe("en");
  });

  it("falls back to the company default when the user has none", () => {
    expect(resolveUiLocale(null, "en")).toBe("en");
  });

  it("falls back to tr when neither is set", () => {
    expect(resolveUiLocale(null, null)).toBe("tr");
  });

  it("falls back to tr for an unsupported/unknown locale", () => {
    expect(resolveUiLocale("fr", "de")).toBe("tr");
  });
});
