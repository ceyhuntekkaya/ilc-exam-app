import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const usePreviewMock = vi.fn();
const openMutateMock = vi.fn();

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  usePreview: () => usePreviewMock(),
  useOpen: () => ({ mutateAsync: openMutateMock, isPending: false }),
  getCandidatesQueryKey: (id: string) => [`/c/${id}`],
  getDetailQueryKey: (id: string) => [`/d/${id}`],
  getList3QueryKey: () => ["/list"],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { PreviewOpenStep } = await import("./PreviewOpenStep");

function previewOf(data: object) {
  usePreviewMock.mockReturnValue({ data: { data }, isLoading: false, isError: false, error: null, refetch: vi.fn() });
}

describe("PreviewOpenStep", () => {
  afterEach(() => {
    usePreviewMock.mockReset();
    openMutateMock.mockReset();
  });

  it("hak yetmiyorsa kırmızı 'N kişi hedefleniyor, kalan hak M' uyarısını gösterir ve kimsenin elenmediğini söyler", () => {
    previewOf({ recipientCount: 120, duplicateCount: 0, omittedByReason: {}, quotaRequired: 120, quotaAvailable: 80 });
    renderWithProviders(<PreviewOpenStep distributionId="d1" canOpen onBack={() => {}} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("120 kişi hedefleniyor, kalan hak 80.");
    expect(alert).toHaveTextContent("Kimse hedeften çıkarılmaz");
    expect(alert).toHaveTextContent("40 kişi atlanır");
  });

  it("hak yetiyorsa uyarı yok; eleme nedenleri Türkçe listelenir", () => {
    previewOf({ recipientCount: 10, duplicateCount: 1, omittedByReason: { NO_ACTIVE_MEMBERSHIP: 2 } });
    renderWithProviders(<PreviewOpenStep distributionId="d1" canOpen onBack={() => {}} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Kurumda aktif üyeliği yok")).toBeInTheDocument();
  });

  it("açma onay penceresi geri alınamazlığı belirtir; onayda açar ve üç sayıyı gösterir", async () => {
    previewOf({ recipientCount: 120, duplicateCount: 0, omittedByReason: {}, quotaRequired: 120, quotaAvailable: 80 });
    openMutateMock.mockResolvedValue({ data: { allocatedCount: 80, skippedForQuotaCount: 40, conflictCount: 0 } });
    renderWithProviders(<PreviewOpenStep distributionId="d1" canOpen onBack={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Dağıtımı aç" }));
    expect(screen.getByText(/geri alınamaz/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Evet, aç" }));

    await waitFor(() => expect(openMutateMock).toHaveBeenCalledWith({ distributionId: "d1" }));
    expect(await screen.findByText("80 kişiye hak ayrıldı.")).toBeInTheDocument();
    expect(screen.getByText("40 kişi hak yetmediği için atlandı.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adayları izle" })).toHaveAttribute("href", "/staff/distributions/d1");
  });

  it("açma hatası (409) backend mesajıyla gösterilir", async () => {
    previewOf({ recipientCount: 5, duplicateCount: 0, omittedByReason: {} });
    openMutateMock.mockRejectedValue(new Error("Paket süresi dolmuş"));
    renderWithProviders(<PreviewOpenStep distributionId="d1" canOpen onBack={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Dağıtımı aç" }));
    fireEvent.click(screen.getByRole("button", { name: "Evet, aç" }));

    expect(await screen.findByText("Paket süresi dolmuş")).toBeInTheDocument();
  });

  it("hedeflenen kimse yoksa açma düğmesi pasif", () => {
    previewOf({ recipientCount: 0, duplicateCount: 0, omittedByReason: {} });
    renderWithProviders(<PreviewOpenStep distributionId="d1" canOpen onBack={() => {}} />);
    expect(screen.getByRole("button", { name: "Dağıtımı aç" })).toBeDisabled();
  });
});
