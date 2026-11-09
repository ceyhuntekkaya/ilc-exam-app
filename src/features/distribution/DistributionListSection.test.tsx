import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DistributionRow } from "@/src/api/generated/models";

const useList3Mock = vi.fn();
const canManageMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canManageMock() }));

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useList4: () => useList3Mock(),
  getList4QueryKey: () => ["/my-company/distributions"],
}));

const { DistributionListSection } = await import("./DistributionListSection");

const ROWS: DistributionRow[] = [
  {
    id: "dist-1",
    name: "Kasım Deneme Dağıtımı",
    status: "OPEN",
    mode: "OPEN_WINDOW",
    skuId: "sku-1",
    packageId: "pkg-1",
    createdAt: "2026-11-01T09:00:00Z",
  },
];

describe("DistributionListSection", () => {
  afterEach(() => {
    useList3Mock.mockReset();
    canManageMock.mockReset();
  });

  it("dağıtımları adı, durumu ve detay linkiyle listeler", () => {
    canManageMock.mockReturnValue(true);
    useList3Mock.mockReturnValue({ data: { data: ROWS }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionListSection companyId="company-1" />);

    expect(screen.getByText("Kasım Deneme Dağıtımı")).toBeInTheDocument();
    expect(screen.getByText("Açık")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Detay" })).toHaveAttribute("href", "/staff/distributions/dist-1");
  });

  it("yönetme izni varsa 'Yeni dağıtım' ve taslak için 'Kurulumu sürdür' görünür; izleme izniyle gizlenir", () => {
    const draft = [{ ...ROWS[0], id: "dist-2", name: "Taslak", status: "DRAFT" as const }];
    useList3Mock.mockReturnValue({ data: { data: draft }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    canManageMock.mockReturnValue(true);
    const first = renderWithProviders(<DistributionListSection companyId="company-1" />);
    expect(screen.getByRole("link", { name: "Yeni dağıtım" })).toHaveAttribute("href", "/staff/distributions/new");
    expect(screen.getByRole("link", { name: "Kurulumu sürdür" })).toHaveAttribute("href", "/staff/distributions/dist-2/setup");
    first.unmount();

    canManageMock.mockReturnValue(false);
    renderWithProviders(<DistributionListSection companyId="company-1" />);
    expect(screen.queryByRole("link", { name: "Yeni dağıtım" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Kurulumu sürdür" })).toBeNull();
    expect(screen.getByRole("link", { name: "Detay" })).toBeInTheDocument();
  });

  it("boş listede boş durumu gösterir", () => {
    useList3Mock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionListSection companyId="company-1" />);

    expect(screen.getByText("Henüz dağıtım yok")).toBeInTheDocument();
  });
});
