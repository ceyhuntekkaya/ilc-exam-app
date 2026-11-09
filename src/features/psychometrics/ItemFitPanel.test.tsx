import { fireEvent, renderWithProviders, screen, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const listMock = vi.fn();
const itemMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => true, usePanel: () => ({ basePath: "/staff" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/staff/content/item-fit" }));
vi.mock("@/src/features/psychometrics/central", () => ({
  useCentralRequest: () => ({ ready: true, tenantId: "t", request: undefined }),
  formatWhen: (v?: string | null) => (v ? "tarih" : "—"),
}));
vi.mock("@/src/api/generated/madde-uyumu/madde-uyumu", () => ({
  useList18: (params: unknown) => listMock(params),
  useItem: (id: string) => itemMock(id),
}));

const { ItemFitPanelPage } = await import("./ItemFitPanel");

const state = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  listMock.mockReset();
  itemMock.mockReset();
});

const ROWS = [
  { questionVersionId: "q-avail", model: "RASCH", status: "AVAILABLE", infitMnsq: 0.97, outfitMnsq: 1.41, fitSampleSize: 240, calibrationSampleSize: 260, fitComputedAt: "2026-11-09T10:00:00Z" },
  { questionVersionId: "q-small", model: "RASCH", status: "SUPPRESSED_SMALL_SAMPLE", infitMnsq: 0.5, outfitMnsq: 3.2, fitSampleSize: 8, calibrationSampleSize: 9 },
  { questionVersionId: "q-none", model: "RASCH", status: "NOT_COMPUTED", calibrationSampleSize: 100 },
];

describe("ItemFitPanelPage", () => {
  it("üç durumu ayrı rozetlerle gösterir; bastırılmış/hesaplanmamış satırda sayı yoktur", () => {
    listMock.mockReturnValue(state({ items: ROWS, page: 0, size: 50, total: 3 }));
    renderWithProviders(<ItemFitPanelPage />);
    expect(listMock).toHaveBeenCalledWith({ model: "RASCH", page: 0, size: 50 });
    const row = (id: string) => screen.getByText(id).closest("tr")!;
    expect(within(row("q-avail")).getByText("Hesaplandı")).toBeInTheDocument();
    expect(within(row("q-avail")).getByText("0,97")).toBeInTheDocument();
    expect(within(row("q-avail")).getByText("1,41")).toBeInTheDocument();
    expect(within(row("q-small")).getByText("Örneklem küçük — gizlendi")).toBeInTheDocument();
    expect(within(row("q-small")).queryByText("3,20")).not.toBeInTheDocument();
    expect(within(row("q-none")).getByText("Hesaplanmadı (bilinmiyor)")).toBeInTheDocument();
    expect(screen.queryByText(/^Uyumlu$/)).not.toBeInTheDocument();
  });

  it("boş liste: kalibre madde yok durumu; hata değil", () => {
    listMock.mockReturnValue(state({ items: [], page: 0, size: 50, total: 0 }));
    renderWithProviders(<ItemFitPanelPage />);
    expect(screen.getByText("Bu modelde kalibre edilmiş madde yok")).toBeInTheDocument();
  });

  it("model değişince sayfa 0'dan yeni model sorgulanır", () => {
    listMock.mockReturnValue(state({ items: ROWS, page: 0, size: 50, total: 3 }));
    renderWithProviders(<ItemFitPanelPage />);
    fireEvent.change(screen.getByLabelText("Model"), { target: { value: "TWO_PL" } });
    expect(listMock).toHaveBeenLastCalledWith({ model: "TWO_PL", page: 0, size: 50 });
  });

  it("madde araması: geçersiz UUID gönderilmez; geçerli kimlikte tek madde ucu çağrılır, kayıt yoksa 'bilinmiyor' der", () => {
    listMock.mockReturnValue(state({ items: [], page: 0, size: 50, total: 0 }));
    itemMock.mockReturnValue(state([]));
    renderWithProviders(<ItemFitPanelPage />);
    const input = screen.getByLabelText(/Madde sürümü kimliği/);
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    expect(screen.getByText("Geçerli bir UUID girin")).toBeInTheDocument();
    expect(itemMock).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b" } });
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    expect(itemMock).toHaveBeenCalledWith("0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b");
    expect(screen.getByText("Bu madde için uyum kaydı yok")).toBeInTheDocument();
  });
});
