import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DistributionRow } from "@/src/api/generated/models";

const useList11Mock = vi.fn();

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useList11: () => useList11Mock(),
  getList11QueryKey: () => ["/my-company/distributions"],
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
    useList11Mock.mockReset();
  });

  it("dağıtımları adı, durumu ve detay linkiyle listeler", () => {
    useList11Mock.mockReturnValue({ data: { data: ROWS }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionListSection companyId="company-1" />);

    expect(screen.getByText("Kasım Deneme Dağıtımı")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Detay" })).toHaveAttribute("href", "/staff/distributions/dist-1");
  });

  it("boş listede boş durumu gösterir", () => {
    useList11Mock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionListSection companyId="company-1" />);

    expect(screen.getByText("Henüz dağıtım yok")).toBeInTheDocument();
  });
});
