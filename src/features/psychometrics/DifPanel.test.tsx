import { renderWithProviders, screen, within } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => true, usePanel: () => ({ basePath: "/staff" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/staff/content/dif" }));

const { DimensionTable } = await import("./DifPanel");

describe("DimensionTable", () => {
  it("veri yok, hesaplanmadı ve yanlılık yok ayrı metinler gösterir", () => {
    const { rerender } = renderWithProviders(<DimensionTable dimension={{ key: "AGE_BAND", label: "Yaş bandı", status: "NO_DATA" }} />);
    expect(screen.getByText("Veri yok")).toBeInTheDocument();

    rerender(<DimensionTable dimension={{ key: "NATIVE_LANGUAGE", label: "Ana dil", status: "NOT_COMPUTED", note: "Henüz çalıştırılmadı" }} />);
    expect(screen.getByText("Hesaplanmadı")).toBeInTheDocument();
    expect(screen.getByText("Henüz çalıştırılmadı")).toBeInTheDocument();

    rerender(
      <DimensionTable
        threshold={30}
        dimension={{ key: "AGE_BAND", label: "Yaş bandı", status: "COMPUTED", groups: [{ group: "10-12", n: 120, sufficientData: true, etsLevel: "A", chiSquare: 1.2, oddsRatio: 1.05 }] }}
      />,
    );
    expect(screen.getAllByText("Yanlılık yok (A)").length).toBeGreaterThan(0);
  });

  it("n eşik altındaysa istatistik yerine 'yetersiz veri' gösterilir", () => {
    renderWithProviders(
      <DimensionTable
        threshold={30}
        dimension={{
          key: "INSTITUTION_TYPE",
          label: "Kurum türü",
          status: "COMPUTED",
          groups: [
            { group: "Özel", n: 12, sufficientData: false, etsLevel: "C", chiSquare: 9.9, oddsRatio: 3.2 },
            { group: "Devlet", n: 200, sufficientData: true, etsLevel: "B", chiSquare: 4.4, oddsRatio: 1.8 },
          ],
        }}
      />,
    );
    const rows = screen.getAllByRole("row");
    const ozel = rows.find((r) => within(r).queryByText("Özel"))!;
    expect(within(ozel).getByText("Yetersiz veri")).toBeInTheDocument();
    expect(within(ozel).queryByText("9.900")).not.toBeInTheDocument();
    const devlet = rows.find((r) => within(r).queryByText("Devlet"))!;
    expect(within(devlet).getByText("Orta düzey (B)")).toBeInTheDocument();
    expect(within(devlet).getByText("4.400")).toBeInTheDocument();
  });
});
