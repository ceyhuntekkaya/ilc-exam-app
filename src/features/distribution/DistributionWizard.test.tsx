import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const query = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, error: null, refetch: vi.fn() });

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock() }));
vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useDetail: () => ({ data: undefined, isLoading: false, isError: false }),
  useCreate3: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdate2: () => ({ mutateAsync: updateMock, isPending: false }),
  getList6QueryKey: () => ["/list"],
  getDetailQueryKey: (id: string) => [`/d/${id}`],
  getTargetRulesQueryKey: (id: string) => [`/r/${id}`],
  getPreviewQueryKey: (id: string) => [`/p/${id}`],
  useTargetRules: () => query([]),
  useAddTargetRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveTargetRule: () => ({ mutateAsync: vi.fn(), isPending: false }),
  usePreview: () => query({ recipientCount: 0, omittedByReason: {}, duplicateCount: 0 }),
  useOpen: () => ({ mutateAsync: vi.fn(), isPending: false }),
  getCandidatesQueryKey: (id: string) => [`/c/${id}`],
}));
vi.mock("@/src/api/generated/company-ledger/company-ledger", () => ({
  usePackages: () =>
    query([{ packageId: "pkg-1", skuId: "sku-1", status: "ACTIVE", scope: "COMPANY", availableBalance: 50, validFrom: "2026-01-01", validUntil: "2026-12-31" }]),
}));
vi.mock("@/src/api/generated/product-sku-catalog/product-sku-catalog", () => ({
  useList: () => query([{ id: "sku-1", name: "B1 Seviye Belirleme" }]),
}));
vi.mock("@/src/api/generated/exam-authoring/exam-authoring", () => ({
  useList15: () => query({ items: [{ id: "11111111-2222-3333-4444-555555555555", title: "Kasım Sınavı", code: "K-1" }] }),
}));
vi.mock("@/src/api/generated/exam-centers/exam-centers", () => ({
  useList11: () => query([]),
  useListSessions: () => query([]),
}));

const { DistributionWizard } = await import("./DistributionWizard");

function fillBasics() {
  fireEvent.change(screen.getByLabelText(/Dağıtım adı/), { target: { value: "Kasım Denemesi" } });
  fireEvent.change(screen.getByLabelText(/Hak paketi/), { target: { value: "pkg-1" } });
  fireEvent.change(screen.getByLabelText(/^Sınav/), { target: { value: "11111111-2222-3333-4444-555555555555" } });
  fireEvent.click(screen.getByRole("button", { name: "İleri" }));
}

describe("DistributionWizard", () => {
  afterEach(() => {
    canMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
  });

  it("yazma yetkisi yoksa sihirbaz yerine yetki mesajı gösterir", () => {
    canMock.mockReturnValue(false);
    renderWithProviders(<DistributionWizard companyId="c1" />);
    expect(screen.getByText("Bu işlem için yetkiniz yok")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Dağıtım adı/)).toBeNull();
  });

  it("eksik bilgiyle adım 2'ye geçilmez", () => {
    canMock.mockReturnValue(true);
    renderWithProviders(<DistributionWizard companyId="c1" />);
    fireEvent.click(screen.getByRole("button", { name: "İleri" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Dağıtıma bir ad verin.");
  });

  it("kip seçilmeden taslak oluşturulamaz (K-U07)", async () => {
    canMock.mockReturnValue(true);
    renderWithProviders(<DistributionWizard companyId="c1" />);
    fillBasics();

    expect(screen.getByText(/kip seçilmeden dağıtım oluşturulamaz/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Taslağı oluştur/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("kip seçilmeden devam edilemez");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("açık pencere seçilince doğru istekle taslağı oluşturur ve hedeflemeye geçer", async () => {
    canMock.mockReturnValue(true);
    createMock.mockResolvedValue({ data: { id: "d1", name: "Kasım Denemesi", status: "DRAFT" } });
    renderWithProviders(<DistributionWizard companyId="c1" />);
    fillBasics();

    fireEvent.click(screen.getByLabelText(/Açık pencere/));
    fireEvent.change(screen.getByLabelText(/Açılış/), { target: { value: "2026-11-10T10:00" } });
    fireEvent.change(screen.getByLabelText(/Kapanış/), { target: { value: "2026-11-11T12:30" } });
    fireEvent.click(screen.getByRole("button", { name: /Taslağı oluştur/ }));

    await waitFor(() =>
      expect(createMock).toHaveBeenCalledWith({
        data: {
          name: "Kasım Denemesi",
          skuId: "sku-1",
          packageId: "pkg-1",
          examId: "11111111-2222-3333-4444-555555555555",
          mode: { mode: "OPEN_WINDOW", windowOpensAt: "2026-11-10T07:00:00.000Z", windowClosesAt: "2026-11-11T09:30:00.000Z" },
        },
      }),
    );
    expect(await screen.findByText("Eklenen kurallar")).toBeInTheDocument();
  });

  it("backend hata mesajı (400/409) kullanıcıya gösterilir", async () => {
    canMock.mockReturnValue(true);
    createMock.mockRejectedValue(new Error("SKU satışa açık değil"));
    renderWithProviders(<DistributionWizard companyId="c1" />);
    fillBasics();
    fireEvent.click(screen.getByLabelText(/Açık pencere/));
    fireEvent.change(screen.getByLabelText(/Açılış/), { target: { value: "2026-11-10T10:00" } });
    fireEvent.change(screen.getByLabelText(/Kapanış/), { target: { value: "2026-11-11T12:30" } });
    fireEvent.click(screen.getByRole("button", { name: /Taslağı oluştur/ }));

    expect(await screen.findByText("SKU satışa açık değil")).toBeInTheDocument();
  });
});
