import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CandidateRow, DistributionRow } from "@/src/api/generated/models";

const useDetailMock = vi.fn();
const useCandidatesMock = vi.fn();
vi.mock("@/src/features/distribution/TargetingStep", () => ({
  TargetingStep: ({ live }: { live?: boolean }) => <div data-testid="targeting-live">{String(live)}</div>,
}));
const canMock = vi.fn(() => true);
vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock() }));
// Yönetim düğmelerinin kendi testi var (DistributionManageActions.test.tsx); burada yalnız görünürlük denetlenir.
vi.mock("@/src/features/distribution/DistributionManageActions", () => ({
  DistributionManageActions: () => <div data-testid="manage-actions" />,
}));

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
    canMock.mockReturnValue(true);
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
      data: {
        data: [{
          ...CANDIDATES[0],
          status: "STARTED",
          latestApplicationId: "app-1",
          progress: {
            applicationId: "app-1",
            attendance: "TAKEN",
            status: "SUBMITTED",
            finishedReason: "STUDENT_FINISHED",
            gradingState: "AWAITING_MANUAL",
            manualTotal: 3,
            manualPending: 2,
          },
        }],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Başladı", { selector: "span" })).toBeInTheDocument();
    // K6: katılım ve değerlendirme durumu satırda görünür.
    expect(screen.getByText("Teslim etti", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Otomatik tamam · elle değerlendirme 2 eksik (1/3)")).toBeInTheDocument();
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

  it("yönetim eylemleri yalnız assignment:manage olana görünür", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    const { unmount } = renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);
    expect(screen.getByTestId("manage-actions")).toBeInTheDocument();
    unmount();

    canMock.mockReturnValue(false);
    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);
    expect(screen.queryByTestId("manage-actions")).toBeNull();
  });

  it("açılmış dağıtımda kurallar düzenlenebilir; düzenleyici canlı kipte açılır", async () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.queryByTestId("targeting-live")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Kuralları düzenle" }));
    expect(screen.getByTestId("targeting-live")).toHaveTextContent("true");
  });

  it("taslak ve iptal edilmiş dağıtımda kural düzenleyici yoktur", () => {
    useCandidatesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    for (const status of ["DRAFT", "CANCELLED"] as const) {
      useDetailMock.mockReturnValue({ data: { data: { ...DISTRIBUTION, status } }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
      const { unmount } = renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);
      expect(screen.queryByRole("button", { name: "Kuralları düzenle" })).toBeNull();
      unmount();
    }
  });
});
