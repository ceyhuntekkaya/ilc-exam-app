import { describe, expect, it } from "vitest";
import { sanitizeRichText } from "./html";

describe("sanitizeRichText yazı boyutu", () => {
  it("izinli data-size değerini korur", () => {
    expect(sanitizeRichText('<p>a <span data-size="xl">büyük</span></p>')).toBe('<p>a <span data-size="xl">büyük</span></p>');
  });
  it("bilinmeyen değeri ve başka öznitelikleri atar", () => {
    expect(sanitizeRichText('<span data-size="99px" class="x">a</span>')).toBe("<span>a</span>");
  });
});
