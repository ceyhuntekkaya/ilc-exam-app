import { QuestionView } from "@/src/features/exam-player/QuestionView";
import { wideImageColumns } from "@/src/features/exam-player/interactions/OptionChip";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it } from "vitest";

/**
 * Görsel şıklı çoktan seçmeli yerleşimi: uyaran (stimulus) boşsa içerik tam genişliktir →
 * ≤4 şık hepsi tek satırda genişliği paylaşır, 4'ten fazlası 4'erli satırlara bölünür;
 * tek bölümde şıklar yönergenin altındaki boş alanda dikey ortalanır.
 */
function imageOptions(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `o${i + 1}`, mediaId: `m${i + 1}` }));
}

function modelOf(opts: {
  n: number;
  format?: "IMAGE" | "TEXT";
  type?: "MULTIPLE_CHOICE" | "MULTIPLE_RESPONSE";
  stimulus?: boolean;
  parts?: number;
}): QuestionViewModel {
  const { n, format = "IMAGE", type = "MULTIPLE_CHOICE", stimulus = false, parts = 1 } = opts;
  return {
    instruction: "Pick the cat.",
    stimulus: stimulus ? [{ type: "TEXT", id: "s1", text: "Read this first." }] : [],
    parts: Array.from({ length: parts }, (_, p) => ({
      id: `p${p + 1}`,
      position: p,
      interactionType: type,
      stem: [],
      interaction: { format, options: imageOptions(n) },
    })),
  };
}

function grid(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[role="radiogroup"], [role="group"]')!;
}

describe("wideImageColumns", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 4],
    [9, 4],
  ])("%i options → %i columns", (count, cols) => {
    expect(wideImageColumns(count)).toBe(cols);
  });
});

describe("image multiple choice, no stimulus (full-width content)", () => {
  it.each([
    [1, "1", "1"],
    [2, "2", "2"],
    [3, "3", "2"],
    [4, "4", "2"],
    [6, "4", "2"],
  ])("%i options → %s columns wide, %s columns narrow", (n, wide, narrow) => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n })} />);
    const g = grid(container);

    expect(g.style.getPropertyValue("--cols")).toBe(wide);
    expect(g.style.getPropertyValue("--cols-narrow")).toBe(narrow);
    expect(g.className).toContain("@lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]");
    expect(screen.getAllByRole("radio")).toHaveLength(n);
  });

  it("also fills the width for multiple response (checkbox) image questions", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 3, type: "MULTIPLE_RESPONSE" })} />);

    expect(grid(container).style.getPropertyValue("--cols")).toBe("3");
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("centers the choices vertically in the space left under the instruction", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 4 })} />);
    const body = container.querySelector(".exam-player")!;
    const choices = body.querySelector<HTMLElement>(":scope > .grid")!;

    expect(body).toHaveClass("flex", "flex-1", "flex-col");
    expect(choices).toHaveClass("flex-1", "content-center");
  });

  it("shapes the image so it follows the panel width instead of a fixed height", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 2 })} />);
    const img = grid(container).querySelector("img")!;

    expect(img).toHaveClass("aspect-[4/3]", "w-full", "object-contain");
    expect(img).not.toHaveClass("h-40");
  });

  it("keeps the fixed-height image when a stimulus shares the row", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 2, stimulus: true })} />);
    const img = grid(container).querySelector("img")!;

    expect(img).toHaveClass("h-40");
    expect(img).not.toHaveClass("aspect-[4/3]");
  });
});

describe("image multiple choice keeps the old layout when it should", () => {
  it("with a stimulus: two fixed columns, no centering", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 4, stimulus: true })} />);
    const g = grid(container);
    const body = container.querySelector(".exam-player")!;

    expect(g.style.getPropertyValue("--cols")).toBe("");
    expect(g).toHaveClass("grid-cols-2");
    expect(body).not.toHaveClass("flex-1");
    expect(body.querySelector(":scope > .grid")).not.toHaveClass("content-center");
  });

  it("with text options: no wide columns, no centering", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 4, format: "TEXT" })} />);
    const g = grid(container);

    expect(g.style.getPropertyValue("--cols")).toBe("");
    expect(g).not.toHaveClass("grid-cols-2");
    expect(container.querySelector(".exam-player")).not.toHaveClass("flex-1");
  });

  it("with several parts: columns fill the width but nothing is vertically centered", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ n: 3, parts: 2 })} />);

    expect(grid(container).style.getPropertyValue("--cols")).toBe("3");
    expect(container.querySelector(".exam-player")).not.toHaveClass("flex-1");
  });
});
