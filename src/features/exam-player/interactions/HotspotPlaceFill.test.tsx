import { QuestionView } from "@/src/features/exam-player/QuestionView";
import { HotspotPlaceView } from "@/src/features/exam-player/interactions/HotspotViews";
import type { QuestionViewModel } from "@/src/features/exam-player/types";
import { fireEvent, renderWithProviders, screen, within } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

/**
 * HOTSPOT_PLACE (tek bölüm): iki sütun — SOLDA uyaran metni + kart havuzu, SAĞDA tahta; tahta kalan alanı oranı
 * bozulmadan doldurur. Ölçü/yerleşim CSS'te (cqw/cqh, grid) — burada yapı, yer değiştirme (portal) ve etkileşim doğrulanır;
 * gerçek ölçüler tarayıcıda alındı (jsdom yerleşim bilmez).
 */
const interaction = {
  mediaId: "board",
  draggables: [
    { id: "d1", text: "Hat" },
    { id: "d2", text: "Cup" },
  ],
  zones: [
    { id: "z1", label: "Head", shape: { kind: "RECT", x: 0.1, y: 0.1, w: 0.2, h: 0.2 } },
    { id: "z2", label: "Table", shape: { kind: "RECT", x: 0.5, y: 0.5, w: 0.2, h: 0.2 } },
  ],
};

function modelOf(opts: { stimulus?: boolean; parts?: number } = {}): QuestionViewModel {
  const { stimulus = true, parts = 1 } = opts;
  return {
    instruction: "Put each thing in its place.",
    stimulus: stimulus ? [{ type: "TEXT", id: "s1", text: "Read the park notes first." }] : [],
    parts: Array.from({ length: parts }, (_, p) => ({
      id: `p${p + 1}`,
      position: p,
      interactionType: "HOTSPOT_PLACE",
      stem: [],
      interaction,
    })),
  };
}

const aside = (c: HTMLElement) => c.querySelector("aside") as HTMLElement;
const board = (c: HTMLElement) => c.querySelector("img")!.parentElement as HTMLElement;
const grid = (c: HTMLElement) => c.querySelector(".exam-player > .grid") as HTMLElement;

describe("HOTSPOT_PLACE two-column fill", () => {
  it("puts the stimulus text and the card pool in the left column, the board in the right one", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const left = within(aside(container));

    expect(left.getByText("Read the park notes first.")).toBeInTheDocument();
    expect(left.getByText(/^cards$/i)).toBeInTheDocument();
    expect(left.getByRole("button", { name: "Hat" })).toBeInTheDocument();
    expect(aside(container).contains(board(container))).toBe(false);
    expect(grid(container).querySelector("section")!.contains(board(container))).toBe(true);
    expect(grid(container)).toHaveClass("@3xl:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]", "flex-1");
  });

  it("keeps the left column from driving the row height, so the board does not resize as cards leave the pool", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);

    expect(aside(container)).toHaveClass("@3xl:[contain:size]", "@3xl:overflow-y-auto");
  });

  it("also uses the left column for the pool when there is no stimulus text", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf({ stimulus: false })} />);

    expect(aside(container)).toBeInTheDocument();
    expect(within(aside(container)).getByRole("button", { name: "Hat" })).toBeInTheDocument();
  });

  it("chains the remaining height from the question body down to the board stage", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);

    expect(container.querySelector(".exam-player")).toHaveClass("flex", "flex-1", "flex-col");
    expect(container.querySelector("section")).toHaveClass("flex", "flex-1", "flex-col");
    expect(container.querySelector(".basis-0")).toContainElement(board(container));
  });

  it("sizes the board by the picture's own ratio once it loads", () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const img = container.querySelector("img")!;
    expect(board(container)).toHaveClass("aspect-(--ratio)");
    expect(board(container).style.getPropertyValue("--ratio")).toBe("1.5");

    Object.defineProperty(img, "naturalWidth", { value: 1000 });
    Object.defineProperty(img, "naturalHeight", { value: 1000 });
    fireEvent.load(img);

    expect(board(container).style.getPropertyValue("--ratio")).toBe("1");
  });

  it("still places a card by tapping it and then the place, and then offers Start over", async () => {
    const { container } = renderWithProviders(<QuestionView model={modelOf()} />);
    const startOver = () => screen.getByRole("button", { name: /start over/i, hidden: true });
    expect(startOver().parentElement).toHaveClass("invisible");

    await userEvent.click(screen.getByRole("button", { name: "Hat" }));
    await userEvent.click(screen.getByRole("button", { name: "Put the card in Head" }));

    // Kart havuzdan çıktı, alana girdi (alandaki kart "tap to take it back").
    expect(within(aside(container)).queryByRole("button", { name: "Hat" })).toBeNull();
    expect(screen.getByRole("button", { name: /Hat\. Tap to take it back/ })).toBeInTheDocument();
    // "Start over" tahtanın altında yer tutuyordu; şimdi görünür.
    expect(startOver().parentElement).not.toHaveClass("invisible");
    expect(aside(container).contains(startOver())).toBe(false);
  });
});

describe("HOTSPOT_PLACE keeps the old layout when it should", () => {
  it("with several parts: no two-column fill, pool stays beside the board", () => {
    // uyaransız: sol sütun (aside) yalnız havuz içindi — çok bölümde hiç kurulmaz
    const { container } = renderWithProviders(<QuestionView model={modelOf({ parts: 2, stimulus: false })} />);

    expect(container.querySelector("aside")).toBeNull();
    expect(container.querySelector(".exam-player")).not.toHaveClass("flex-1");
    expect(container.querySelector(".basis-0")).toBeNull();
    expect(board(container)).toHaveClass("w-fit");
  });

  it("standalone with fill but no slot: the pool stays above the board instead of vanishing", async () => {
    renderWithProviders(<HotspotPlaceView interaction={interaction} fill />);

    await userEvent.click(screen.getByRole("button", { name: "Hat" }));
    // kart seçilince alanlar dokunma hedefi olur: havuz ve tahta aynı yerde çalışıyor
    expect(screen.getByRole("button", { name: "Put the card in Head" })).toBeInTheDocument();
  });

  it("without fill: Start over appears only after a card is placed (no reserved space)", async () => {
    renderWithProviders(<HotspotPlaceView interaction={interaction} />);
    expect(screen.queryByRole("button", { name: /start over/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Hat" }));
    await userEvent.click(screen.getByRole("button", { name: "Put the card in Head" }));

    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });
});
