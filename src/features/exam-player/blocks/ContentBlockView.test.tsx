import { describe, expect, it } from "vitest";
import { ContentBlockListView, imageSizeOf } from "@/src/features/exam-player/blocks/ContentBlockView";
import type { ContentBlock } from "@/src/features/exam-player/types";
import { renderWithProviders } from "@/src/test/renderWithProviders";

const img = (id: string, size?: "SMALL" | "MEDIUM" | "LARGE" | null): ContentBlock => ({ type: "IMAGE", id, mediaId: `m-${id}`, size });

function imageClasses(container: HTMLElement) {
  return Array.from(container.querySelectorAll("img")).map((el) => el.className);
}

describe("görsel bloğu boyutu", () => {
  it("alan yoksa (eski kayıt) SMALL sayılır", () => {
    expect(imageSizeOf(undefined)).toBe("SMALL");
    expect(imageSizeOf(null)).toBe("SMALL");
  });

  it("boyuta göre sınıf seçer; SMALL eski görünümle aynı", () => {
    const { container } = renderWithProviders(
      <ContentBlockListView blocks={[img("a"), img("b", "MEDIUM"), img("c", "LARGE")]} />,
    );
    const [a, b, c] = imageClasses(container);
    expect(a).toContain("max-h-48");
    expect(b).toContain("max-h-80");
    expect(c).toContain("max-h-[70dvh]");
  });

  it("yalnız küçük görseller yan yana gruplanır", () => {
    const small = renderWithProviders(<ContentBlockListView blocks={[img("a"), img("b")]} />).container;
    expect(small.querySelectorAll(".\\@container .grid.gap-3").length).toBe(1);
    const large = renderWithProviders(<ContentBlockListView blocks={[img("a", "LARGE"), img("b", "LARGE")]} />).container;
    expect(large.querySelectorAll(".\\@container .grid.gap-3").length).toBe(0);
  });
});
