import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CandidateRow, DistributionRow } from "@/src/api/generated/models";

const useDetailMock = vi.fn();
const useCandidatesMock = vi.fn();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useDetail: () => useDetailMock(),
  useCandidates: () => useCandidatesMock(),
  getDetailQueryKey: (id: string) => [`/my-company/distributions/${id}`],
  getCandidatesQueryKey: (id: string) => [`/my-company/distributions/${id}/candidates`],
}));

// jsdom <dialog> `showModal`/`close`'u uygulamaz — `FormDialog` bunlara dayanıyor (bkz. `src/ui/composites/FormDialog.tsx`).
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

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
    status: "ASSIGNED",
    createdAt: "2026-11-02T09:00:00Z",
  },
];

describe("DistributionDetailSection", () => {
  afterEach(() => {
    useDetailMock.mockReset();
    useCandidatesMock.mockReset();
    pushMock.mockReset();
  });

  it("dağıtım detayını ve aday listesini gösterir", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: CANDIDATES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Kasım Deneme Dağıtımı")).toBeInTheDocument();
    expect(screen.getByText("Ayşe Yılmaz")).toBeInTheDocument();
  });

  it("CandidateRow applicationId taşımadığı için 'Sonuç gör' elle girilen başvuru kimliğiyle sonuç rotasına yönlendirir", async () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: CANDIDATES }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Sonuç gör" }));
    fireEvent.change(screen.getByPlaceholderText("00000000-0000-0000-0000-000000000000"), {
      target: { value: "application-9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Göster" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/staff/distributions/dist-1/candidates/identity-1/result/application-9",
      );
    });
  });

  it("boş aday listesinde boş durumu gösterir", () => {
    useDetailMock.mockReturnValue({ data: { data: DISTRIBUTION }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
    useCandidatesMock.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<DistributionDetailSection companyId="company-1" distributionId="dist-1" />);

    expect(screen.getByText("Henüz aday yok")).toBeInTheDocument();
  });
});
