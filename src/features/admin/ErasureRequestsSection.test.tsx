import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const listMock = vi.fn();
const executeMock = vi.fn();
const rejectMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin" }) }));
vi.mock("@/src/api/generated/erasure-requests/erasure-requests", () => ({
  useList7: (params: unknown) => listMock(params),
  useExecute: () => ({ mutateAsync: executeMock, isPending: false }),
  useReject1: () => ({ mutateAsync: rejectMock, isPending: false }),
  getList7QueryKey: () => ["/erasure-requests"],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { ErasureRequestsSection } = await import("./ErasureRequestsSection");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, isSuccess: true, refetch: vi.fn() });
const REQ = { id: "11111111-aaaa-bbbb", subjectUserId: "22222222-cccc", requestedVia: "SELF", status: "RECEIVED", reason: "Verilerimi silin", createdAt: "2026-11-01T10:00:00Z", dueAt: "2026-12-01T10:00:00Z", overdue: false };
const RETAINED = [
  { category: "RESULT", reason: "Puan ve sonuç silinmez" },
  { category: "LEDGER", reason: "Yasal saklama yükümlülüğü" },
];
const PREVIEW_DEFER = {
  requestId: REQ.id,
  dryRun: true,
  status: "WOULD_DEFER",
  failed: 0,
  applications: [
    { applicationId: "app-hold-0000", status: "PREVIEW", blocker: "LEGAL_HOLD", counts: {}, wouldErase: [] },
    { applicationId: "app-free-0000", status: "PREVIEW", counts: {}, wouldErase: ["SES", "YANIT"] },
    { applicationId: "app-open-0000", status: "PREVIEW", blocker: "NOT_SETTLED", counts: {}, wouldErase: [] },
  ],
  retained: RETAINED,
  linkedAccounts: [{ userId: "99999999-zzzz", companyId: "c", userType: "STUDENT" }],
  waivedApplications: [],
};

afterEach(() => {
  vi.clearAllMocks();
  [canMock, listMock].forEach((m) => m.mockReset());
});

function open() {
  fireEvent.click(screen.getByRole("button", { name: "İncele / yürüt" }));
}

describe("ErasureRequestsSection", () => {
  it("talepleri listeler; gecikmiş rozeti; yetkisizde yürüt/reddet düğmesi yok, ayrıntı var", () => {
    canMock.mockReturnValue(false);
    listMock.mockReturnValue(ok([{ ...REQ, overdue: true }]));
    renderWithProviders(<ErasureRequestsSection />);
    expect(screen.getByText("Gecikmiş")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İncele / yürüt" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reddet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ayrıntı" })).toBeInTheDocument();
  });

  it("boş liste boş durum gösterir", () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([]));
    renderWithProviders(<ErasureRequestsSection />);
    expect(screen.getByText("Silme talebi yok")).toBeInTheDocument();
  });

  it("kuru koşum varsayılan: dryRun:true gönderilir, DEFERRED açıklaması, engeller, korunanlar ve bağlı hesaplar görünür; gerçek yürütme kilitli", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([REQ]));
    executeMock.mockResolvedValue({ data: PREVIEW_DEFER });
    renderWithProviders(<ErasureRequestsSection />);
    open();
    const real = screen.getByRole("button", { name: /Gerçek silmeyi yürüt/ });
    expect(real).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum (önizleme)" }));
    await waitFor(() => expect(executeMock).toHaveBeenCalledWith({ id: REQ.id, data: { dryRun: true } }));
    const view = await screen.findByTestId("execution-view");
    expect(within(view).getByText("Kuru koşum: ertelenirdi")).toBeInTheDocument();
    expect(within(view).getByText("Yasal tutma var")).toBeInTheDocument();
    expect(within(view).getByText("Ses kaydı, Yanıt içeriği")).toBeInTheDocument();
    expect(within(screen.getByTestId("retained")).getByText(/Puan ve sonuç silinmez/)).toBeInTheDocument();
    expect(within(view).getByText(/DİĞER hesaplar var/)).toBeInTheDocument();
    expect(real).toBeEnabled();
  });

  it("gerçek yürütme: ifade onayı sonrası dryRun:false; COMPLETED açıklaması gösterilir", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([REQ]));
    executeMock.mockResolvedValueOnce({ data: { ...PREVIEW_DEFER, status: "WOULD_COMPLETE", applications: [] } });
    executeMock.mockResolvedValueOnce({ data: { requestId: REQ.id, dryRun: false, status: "COMPLETED", failed: 0, applications: [{ applicationId: "app-free-0000", status: "ERASED", counts: { SES: 2 } }], retained: RETAINED } });
    renderWithProviders(<ErasureRequestsSection />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum (önizleme)" }));
    await screen.findByTestId("execution-view");
    fireEvent.click(screen.getByRole("button", { name: /Gerçek silmeyi yürüt/ }));
    const dialog = screen.getByRole("dialog", { name: /Gerçek silme yürütülsün mü/ });
    fireEvent.change(within(dialog).getByLabelText(/yazınız/), { target: { value: "SİL" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Evet, kalıcı olarak sil" }));
    await waitFor(() => expect(executeMock).toHaveBeenLastCalledWith({ id: REQ.id, data: { dryRun: false } }));
    const view = await screen.findByTestId("execution-view");
    expect(within(view).getByText("Tamamlandı")).toBeInTheDocument();
    expect(within(view).getByText(/kimliği anonimleştirildi|hesap\/profil kimliği anonimleştirildi/)).toBeInTheDocument();
  });

  it("yerleşmemiş deneme kararı: yalnız NOT_SETTLED'da seçenek; seçim sonrası yeniden kuru koşum gerekir ve gövde waive alanlarını taşır", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([REQ]));
    executeMock.mockResolvedValue({ data: PREVIEW_DEFER });
    renderWithProviders(<ErasureRequestsSection />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum (önizleme)" }));
    const view = await screen.findByTestId("execution-view");
    const boxes = within(view).getAllByRole("checkbox");
    expect(boxes).toHaveLength(1); // yasal tutma satırında seçenek yok
    fireEvent.click(boxes[0]);
    expect(screen.getByRole("button", { name: /Gerçek silmeyi yürüt/ })).toBeDisabled();
    expect(screen.getByText(/Karar değişti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum (önizleme)" }));
    expect(executeMock).toHaveBeenCalledTimes(1); // gerekçe yok: gönderilmez
    fireEvent.change(screen.getByLabelText(/Yerleşmemiş denemeyi silme kararının gerekçesi/), { target: { value: "Terk edilmiş deneme" } });
    fireEvent.click(screen.getByRole("button", { name: "Kuru koşum (önizleme)" }));
    await waitFor(() => expect(executeMock).toHaveBeenLastCalledWith({ id: REQ.id, data: { dryRun: true, waiveUnsettled: ["app-open-0000"], waiverReason: "Terk edilmiş deneme" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Gerçek silmeyi yürüt/ })).toBeEnabled());
  });

  it("ret: gerekçe zorunlu, sunucu 409 mesajı aynen", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([REQ]));
    rejectMock.mockRejectedValue(Object.assign(new Error("Talep kapalı: COMPLETED"), { status: 409 }));
    renderWithProviders(<ErasureRequestsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Reddet" }));
    const dialog = screen.getByRole("dialog", { name: /reddedilsin mi/ });
    fireEvent.change(within(dialog).getByLabelText(/Ret gerekçesi/), { target: { value: "Kimlik doğrulanamadı" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reddet" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Talep kapalı: COMPLETED");
    expect(rejectMock).toHaveBeenCalledWith({ id: REQ.id, data: { reason: "Kimlik doğrulanamadı" } });
  });

  it("kapalı talepte yürüt/reddet yok", () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([{ ...REQ, status: "COMPLETED" }]));
    renderWithProviders(<ErasureRequestsSection />);
    expect(screen.queryByRole("button", { name: "Reddet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İncele / yürüt" })).not.toBeInTheDocument();
  });
});
