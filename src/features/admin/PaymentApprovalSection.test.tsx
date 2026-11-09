import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const listState = vi.fn();
const deadState = vi.fn();
const approveMock = vi.fn();
const refundMock = vi.fn();
const retryMock = vi.fn();
const byReferenceMock = vi.fn();

vi.mock("@/src/api/generated/payment/payment", () => ({
  useList5: () => listState(),
  useGrantJobs: () => deadState(),
  useApprove3: () => ({ mutateAsync: approveMock, isPending: false }),
  useRefund: () => ({ mutateAsync: refundMock, isPending: false }),
  useRetryGrantJob: () => ({ mutateAsync: retryMock, isPending: false }),
  byReference: (code: string) => byReferenceMock(code),
  getList5QueryKey: () => ["/payment/orders"],
  getGrantJobsQueryKey: () => ["/payment/grant-jobs"],
}));

// jsdom <dialog> `showModal`/`close`'u uygulamaz.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { PaymentApprovalSection } = await import("./PaymentApprovalSection");

const pending = { id: "o1", referenceCode: "ILC-AAAA-1", candidateName: "Ada Yılmaz", candidateUsername: "ilc100001", skuName: "Seviye Tespit", price: 450, currency: "TRY", status: "CREATED", createdAt: "2026-11-09T10:00:00Z" };
const approved = { ...pending, id: "o2", referenceCode: "ILC-BBBB-2", status: "APPROVED", grantStatus: "SUCCEEDED" };

const orders = (items: unknown[]) => ({ data: { data: { items, total: items.length, page: 0, size: 20 } }, isLoading: false, isError: false, refetch: vi.fn() });
const dead = (jobs: unknown[]) => ({ data: { data: jobs }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  listState.mockReset();
  deadState.mockReset();
});

describe("PaymentApprovalSection", () => {
  it("bekleyen siparişi listeler ve onay penceresinden onaylar", async () => {
    listState.mockReturnValue(orders([pending]));
    deadState.mockReturnValue(dead([]));
    approveMock.mockResolvedValue({ data: {} });
    renderWithProviders(<PaymentApprovalSection />);
    expect(screen.getAllByText("ILC-AAAA-1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    fireEvent.click(screen.getByRole("button", { name: "Ödemeyi onayla" }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith({ id: "o1" }));
  });

  it("ölü mektup varsa uyarı panelini üstte gösterir ve yeniden dener", async () => {
    listState.mockReturnValue(orders([]));
    deadState.mockReturnValue(dead([{ id: "j1", referenceCode: "ILC-DEAD-9", candidateName: "Can Er", skuName: "Seviye Tespit", failureKind: "PERMANENT", lastError: "SKU emekli", attemptCount: 5, deadAt: "2026-11-09T09:00:00Z" }]));
    retryMock.mockResolvedValue({ data: { jobId: "j1", granted: true } });
    renderWithProviders(<PaymentApprovalSection />);
    const panel = screen.getByRole("region", { name: /Ödeme alındı, hak üretilemedi \(1\)/ });
    expect(within(panel).getByText("ILC-DEAD-9")).toBeInTheDocument();
    expect(within(panel).getByText("Kalıcı hata")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "Yeniden dene" }));
    await waitFor(() => expect(retryMock).toHaveBeenCalledWith({ id: "j1" }));
  });

  it("ölü mektup yoksa panel görünmez", () => {
    listState.mockReturnValue(orders([]));
    deadState.mockReturnValue(dead([]));
    renderWithProviders(<PaymentApprovalSection />);
    expect(screen.queryByRole("region", { name: /hak üretilemedi/ })).not.toBeInTheDocument();
    expect(screen.getByText("Bekleyen sipariş yok")).toBeInTheDocument();
  });

  it("referans aramada 400 ve 404'ü ayrı mesajlarla gösterir", async () => {
    listState.mockReturnValue(orders([]));
    deadState.mockReturnValue(dead([]));
    renderWithProviders(<PaymentApprovalSection />);
    const input = screen.getByLabelText(/Havale açıklamasındaki kod/);
    byReferenceMock.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 400 }));
    fireEvent.change(input, { target: { value: "ILC-XX" } });
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    await waitFor(() => expect(screen.getByText(/yazım hatası ya da sağlama hanesi/)).toBeInTheDocument());
    byReferenceMock.mockRejectedValueOnce(Object.assign(new Error("x"), { status: 404 }));
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    await waitFor(() => expect(screen.getByText(/bu koda ait sipariş bulunamadı/)).toBeInTheDocument());
  });

  it("referans aramada bulunan siparişi gösterir", async () => {
    listState.mockReturnValue(orders([]));
    deadState.mockReturnValue(dead([]));
    byReferenceMock.mockResolvedValue({ data: pending });
    renderWithProviders(<PaymentApprovalSection />);
    fireEvent.change(screen.getByLabelText(/Havale açıklamasındaki kod/), { target: { value: " ilc aaaa 1 " } });
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    expect(await screen.findByText("Ada Yılmaz")).toBeInTheDocument();
    expect(byReferenceMock).toHaveBeenCalledWith("ilc aaaa 1");
  });

  it("iade: tutar ve gerekçeyi gönderir; IN_USE'ta elle inceleme uyarısı gösterir", async () => {
    listState.mockReturnValue(orders([approved]));
    deadState.mockReturnValue(dead([]));
    refundMock.mockResolvedValue({ data: { id: "r1", entitlement: "IN_USE" } });
    renderWithProviders(<PaymentApprovalSection />);
    fireEvent.click(screen.getByRole("button", { name: "İade et" }));
    fireEvent.change(screen.getByLabelText(/İade tutarı/), { target: { value: "450,00" } });
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "Çift ödeme" } });
    fireEvent.click(screen.getByRole("button", { name: "İadeyi kaydet" }));
    await waitFor(() => expect(refundMock).toHaveBeenCalledWith({ id: "o2", data: { amount: 450, reason: "Çift ödeme" } }));
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/geri alınmadı/);
    expect(status).toHaveTextContent(/Elle inceleme gerekir/);
  });

  it("geçersiz iade tutarında istek göndermez", async () => {
    listState.mockReturnValue(orders([approved]));
    deadState.mockReturnValue(dead([]));
    renderWithProviders(<PaymentApprovalSection />);
    fireEvent.click(screen.getByRole("button", { name: "İade et" }));
    fireEvent.change(screen.getByLabelText(/İade tutarı/), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText(/Gerekçe/), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "İadeyi kaydet" }));
    expect(refundMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/büyük olamaz/)).toBeInTheDocument();
  });
});
