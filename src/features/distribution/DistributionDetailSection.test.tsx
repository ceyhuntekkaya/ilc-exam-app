import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CandidateRow, DistributionRow } from "@/src/api/generated/models";

const useDetailMock = vi.fn();
const useCandidatesMock = vi.fn();
vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => true }));

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useDetail: () => useDetailMock(),
  useCandidates: () => useCandidatesMock(),
  getDetailQueryKey: (id: string) => [`/my-company/distributions/${id}`],
  getCandidatesQueryKey: (id: string) => [`/my-company/distributions/${id}/candidates`],
}));

const { DistributionDetailSection } = await import("./DistributionDetailSection");

const DISTRIBUTION: DistributionRow = {
  id: "dist-1",
  name: "Kasım Deneme Dağıtımı",
  status: "OPEN",
  mode: "OPEN_WINDOW",
  skuId: "sku-1",
  packageId: "pkg-1",
  createdAt: "2026-11-01T09:00:00Z",
};

const CANDIDATES: CandidateRow[] = [
  {
    recipientId: "rec-1",
    ilcIdentityId: "identity-1",
    userAccountId: "user-1",
    firstName: "Ayşe",
    lastName: "Yılmaz",
    status: "ALLOCATED",
    createdAt: "2026-11-02T09:00:00Z",
  },
];

describe("DistributionDetailSection", () => {
  afterEach(() => {
    useDetailMock.mockReset();
    useCandidatesMock.mockReset();
  });

  it("dağıtım detayını ve aday listesini gösterir", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: CANDIDATES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Kasım Deneme Dağıtımı")).toBeInTheDocument();
    expect(screen.getByText("Ayşe Yılmaz")).toBeInTheDocument();
  });

  it("başlamış adaya yeni sonuç rotasına bağlantı verir, elle başvuru kimliği alanı yoktur (K-U06)", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({
      data: { data: [{ ...CANDIDATES[0], status: "STARTED", latestApplicationId: "app-1" }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Başladı", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sonuç gör" })).toHaveAttribute(
      "href",
      "/staff/distributions/dist-1/candidates/identity-1/result",
    );
    expect(screen.queryByPlaceholderText("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("denemesi olmayan adayda sonuç düğmesi yerine 'Aday henüz sınava başlamadı' gösterir", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: CANDIDATES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Aday henüz sınava başlamadı")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sonuç gör" })).toBeNull();
    expect(screen.getByText("Başlamadı", { selector: "span" })).toBeInTheDocument();
  });

  it("boş aday listesinde boş durumu gösterir", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Henüz aday yok")).toBeInTheDocument();
  });
});
