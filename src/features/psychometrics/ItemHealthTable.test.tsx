import { describe, expect, it } from "vitest";

import { ItemHealthTable } from "@/src/features/psychometrics/ItemHealthTable";
import { renderWithProviders, screen } from "@/src/test/renderWithProviders";

describe("ItemHealthTable", () => {
  it("seçenekleri nokta-biserial'e göre azalan sıralar", () => {
    renderWithProviders(
      <ItemHealthTable
        distractors={{
          A: { count: 5, proportion: 0.1, pointBiserial: -0.2 },
          B: { count: 30, proportion: 0.6, pointBiserial: 0.45 },
          C: { count: 15, proportion: 0.3, pointBiserial: 0.05 },
        }}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("B");
    expect(rows[1]).toHaveTextContent("C");
    expect(rows[2]).toHaveTextContent("A");
  });

  it("cevapsız seçeneği rozetle gösterir, ham anahtarı sızdırmaz", () => {
    renderWithProviders(
      <ItemHealthTable
        distractors={{
          A: { count: 10, proportion: 1, pointBiserial: 0.3 },
          _NO_ANSWER: { count: 2, proportion: 0.2, pointBiserial: -0.1 },
        }}
      />,
    );
    expect(screen.getByText("Cevapsız")).toBeInTheDocument();
    expect(screen.queryByText("_NO_ANSWER")).not.toBeInTheDocument();
  });

  it("distraktör yoksa boş durum mesajı gösterir", () => {
    renderWithProviders(<ItemHealthTable distractors={{}} />);
    expect(screen.getByText("Distraktör verisi yok.")).toBeInTheDocument();
  });
});
