import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const listState = vi.fn();
const issueMock = vi.fn();
const revokeMock = vi.fn();
const reissueMock = vi.fn();
const canMock = vi.fn();

vi.mock("@/src/components/auth-provider", () => ({ useAuth: () => ({ user: { companyId: "c-1", userId: "u-1" } }) }));
vi.mock("@/src/features/panel/PanelContext", () => ({
  useCan: (...perms: string[]) => canMock(perms),
  usePanel: () => ({ role: "STAFF", basePath: "/staff", companyId: "c-1" }),
}));
vi.mock("@/src/api/generated/certificate-admin/certificate-admin", () => ({
  useList9: () => listState(),
  getList9QueryKey: () => ["/certificates"],
  useIssue: () => ({ mutateAsync: issueMock, isPending: false }),
  useRevoke: () => ({ mutateAsync: revokeMock, isPending: false }),
  useRevokeAndReissue: () => ({ mutateAsync: reissueMock, isPending: false }),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { CertificateSection } = await import("./CertificateSection");

const UUID_A = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";
const UUID_B = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a7c";
const active = { id: "cert-1", certificateCode: "ILC-AAA-1", status: "ISSUED", locale: "tr", skuId: UUID_B, applicationResultId: UUID_A, issuedAt: "2026-11-01T10:00:00Z" };
const revoked = { id: "cert-2", certificateCode: "ILC-BBB-2", status: "REVOKED", revokedAt: "2026-11-05T10:00:00Z", revocationReason: "Hatalı basım", locale: "en", applicationResultId: UUID_A };
const page = (items: unknown[]) => ({ data: { data: { items, total: items.length, page: 0, size: 20 } }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  listState.mockReset();
  canMock.mockReset();
});

describe("CertificateSection", () => {
  it("boş listede hata değil boş durum gösterir", () => {
    canMock.mockReturnValue(true);
    listState.mockReturnValue(page([]));
    renderWithProviders(<CertificateSection />);
    expect(screen.getByText("Henüz sertifika yok")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("yetkisiz kullanıcıda (yalnız listeleme) yazma düğmeleri gizlidir", () => {
    canMock.mockReturnValue(false);
    listState.mockReturnValue(page([active]));
    renderWithProviders(<CertificateSection />);
    expect(screen.getByText("ILC-AAA-1")).toBeInTheDocument();
    for (const name of ["Sertifika bas", "İptal et", "İptal et ve yeniden bas"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("assignment:evaluate ile yalnız salt iptal görünür; basım ve yeniden basım gizli (K-H06)", () => {
    canMock.mockImplementation((perms: string[]) => perms.includes("assignment:evaluate") && perms.length > 1 ? true : false);
    listState.mockReturnValue(page([active]));
    renderWithProviders(<CertificateSection />);
    expect(screen.getByRole("button", { name: "İptal et" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sertifika bas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İptal et ve yeniden bas" })).not.toBeInTheDocument();
  });

  it("iptal edilmiş sertifikada işlem düğmesi yok, iptal gerekçesi görünür", () => {
    canMock.mockReturnValue(true);
    listState.mockReturnValue(page([revoked]));
    renderWithProviders(<CertificateSection />);
    expect(screen.getByText("İptal edildi")).toBeInTheDocument();
    expect(screen.getByText("Hatalı basım")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "İptal et" })).not.toBeInTheDocument();
  });

  it("kapı kapalıyken basım 409: karşılanmayan koşullar sunucu mesajıyla aynen gösterilir", async () => {
    canMock.mockReturnValue(true);
    listState.mockReturnValue(page([]));
    const message = "Sertifika kapısı kapalı:\n- CALIBRATED_ITEM_RATIO: eşik tanımsız";
    issueMock.mockRejectedValue(Object.assign(new Error(message), { status: 409 }));
    renderWithProviders(<CertificateSection />);
    fireEvent.click(screen.getByRole("button", { name: "Sertifika bas" }));
    const dialog = screen.getByRole("dialog", { name: "Sertifika bas" });
    fireEvent.change(within(dialog).getByLabelText(/Sonuç kimliği/), { target: { value: UUID_A } });
    fireEvent.change(within(dialog).getByLabelText(/Ürün \(SKU\) kimliği/), { target: { value: UUID_B } });
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Sertifika bas" })[0]);
    await waitFor(() => expect(issueMock).toHaveBeenCalledWith({ data: { applicationResultId: UUID_A, skuId: UUID_B, locale: "tr" } }));
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("CALIBRATED_ITEM_RATIO: eşik tanımsız");
  });

  it("iptal: gerekçe olmadan gönderilmez; gerekçeyle iptal çağrılır", async () => {
    canMock.mockReturnValue(true);
    listState.mockReturnValue(page([active]));
    revokeMock.mockResolvedValue({ data: { ...active, status: "REVOKED" } });
    renderWithProviders(<CertificateSection />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et" }));
    const dialog = screen.getByRole("dialog", { name: "Sertifikayı iptal et" });
    fireEvent.click(within(dialog).getByRole("button", { name: "İptal et" }));
    expect(revokeMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText("İptal gerekçesi zorunlu")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "Aday kimliği hatalı" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "İptal et" }));
    await waitFor(() => expect(revokeMock).toHaveBeenCalledWith({ id: "cert-1", data: { reason: "Aday kimliği hatalı" } }));
  });

  it("iptal+yeniden bas: sku önceden dolu gelir ve istek doğru gövdeyle gider", async () => {
    canMock.mockReturnValue(true);
    listState.mockReturnValue(page([active]));
    reissueMock.mockResolvedValue({ data: { id: "cert-3", certificateCode: "ILC-CCC-3" } });
    renderWithProviders(<CertificateSection />);
    fireEvent.click(screen.getByRole("button", { name: "İptal et ve yeniden bas" }));
    const dialog = screen.getByRole("dialog", { name: "Sertifikayı iptal et ve yeniden bas" });
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "Dil hatalı" } });
    fireEvent.click(within(dialog).getAllByRole("button", { name: "İptal et ve yeniden bas" }).at(-1)!);
    await waitFor(() => expect(reissueMock).toHaveBeenCalledWith({ id: "cert-1", data: { reason: "Dil hatalı", skuId: UUID_B, locale: "tr" } }));
  });
});
