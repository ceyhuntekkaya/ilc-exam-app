import { QuestionView } from "@/src/features/exam-player/QuestionView";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { fireEvent, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

/**
 * HOTSPOT_SELECT, uyaran yokken (içerik tam genişlik): görsel kalan boş alanı oranını bozmadan doldurur.
 * Boyut CSS'te (`cqw/cqh`) hesaplanır; burada kutunun doğru oranı aldığı, sahnenin flex zincirine bağlandığı
 * ve uyaran varken eski görünümün korunduğu doğrulanır. Gerçek ölçü/yerleşim tarayıcıda doğrulandı (jsdom yerleşim bilmez).
 */
function modelOf(opts: { stimulus?: boolean; parts?: number } = {}): QuestionViewModel {
  const { stimulus = false, parts = 1 } = opts;
  return {
    instruction: "Tap the child.",
    stimulus: stimulus ? [{ type: "TEXT", id: "s1", text: "Read this first." }] : [],
    parts: Array.from({ length: parts }, (_, p) => ({
      id: `p${p + 1}`,
      position: p,
      interactionType: "HOTSPOT_SELECT",
      stem: [],
      interaction: {
        mediaId: "pic",
        maxSelections: 1,
        regions: [{ id: "r1", label: "Tom", shape: { kind: "RECT", x: 0.1, y: 0.1, w: 0.2, h: 0.2 } }],
      },
    })),
  };
}

/** Görselin sarmalayıcı kutusu (bölge düğmelerinin ve `<img>`'nin ebeveyni). */
function pictureBox(container: HTMLElement) {
  return container.querySelector("img")!.parentElement as HTMLElement;
}

function stage(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".basis-0");
}

describe("HOTSPOT_SELECT fill (no stimulus)", () => {
  it("puts the picture in a stage that takes the remaining height, in the default ratio until the image loads", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const box = pictureBox(container);

    expect(stage(container)).toHaveClass("flex-1", "p-4");
    expect(stage(container)!.contains(box)).toBe(true);
    expect(box).toHaveClass("aspect-(--ratio)");
    expect(box).not.toHaveClass("max-w-2xl");
    expect(box.style.getPropertyValue("--ratio")).toBe("1.5");
  });

  it("takes the picture's own aspect ratio once it loads, so region boxes stay on the picture", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const img = container.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 1200 });
    Object.defineProperty(img, "naturalHeight", { value: 1600 });

    fireEvent.load(img);

    expect(pictureBox(container).style.getPropertyValue("--ratio")).toBe("0.75");
  });

  it("ignores a load event without dimensions instead of breaking the ratio", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const img = container.querySelector("img")!;
    Object.defineProperty(img, "naturalWidth", { value: 0 });
    Object.defineProperty(img, "naturalHeight", { value: 0 });

    fireEvent.load(img);

    expect(pictureBox(container).style.getPropertyValue("--ratio")).toBe("1.5");
  });

  it("chains the stage to the remaining height all the way from the question body", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const body = container.querySelector(".exam-player")!;
    const section = container.querySelector("section")!;

    expect(body).toHaveClass("flex", "flex-1", "flex-col");
    expect(body.querySelector(":scope > .grid")).toHaveClass("flex-1");
    expect(section).toHaveClass("flex", "flex-1", "flex-col");
  });

  it("still selects a region by tapping it", async () => {
    renderWithProviders(<QuestionView model={modelOf()} />);
    const region = screen.getByRole("button", { name: "Tom" });

    await userEvent.click(region);

    expect(region).toHaveAttribute("aria-pressed", "true");
  });
});

describe("HOTSPOT_SELECT keeps the old look when it should", () => {
  it("with a stimulus: capped width, no stage, no ratio box", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ stimulus: true })} />);
    const box = pictureBox(container);

    expect(box).toHaveClass("max-w-2xl", "w-full");
    expect(box).not.toHaveClass("aspect-(--ratio)");
    expect(box.style.getPropertyValue("--ratio")).toBe("");
    expect(stage(container)).toBeNull();
    expect(container.querySelector(".exam-player")).not.toHaveClass("flex-1");
  });

  it("with several parts: no stage chain (nothing to fill)", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ parts: 2 })} />);

    expect(container.querySelector(".exam-player")).not.toHaveClass("flex-1");
    expect(container.querySelector("section")).not.toHaveClass("flex-1");
    expect(stage(container)).toBeNull();
    expect(pictureBox(container)).toHaveClass("max-w-2xl");
  });
});
