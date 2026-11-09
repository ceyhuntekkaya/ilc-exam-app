import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const panelState = vi.fn();
const listProctorsState = vi.fn();
const assignMock = vi.fn();
const credentialsState = vi.fn();
const requestMock = vi.fn();
const approveMock = vi.fn();
const rejectMock = vi.fn();

vi.mock("@/src/components/auth-provider", () => ({ useAuth: () => ({ user: { companyId: "c-1", userId: "u-1" } }) }));
vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => panelState() }));
vi.mock("@/src/api/generated/proctor-console/proctor-console", () => ({
  useListProctors: () => listProctorsState(),
  getListProctorsQueryKey: (id: string) => [`/proctor/sessions/${id}/proctors`],
  useAssignProctor: () => ({ mutateAsync: assignMock, isPending: false }),
}));
vi.mock("@/src/api/generated/proctor-accreditation/proctor-accreditation", () => ({
  useList3: () => credentialsState(),
  getList3QueryKey: () => ["/proctor/credentials"],
  useRequest: () => ({ mutateAsync: requestMock, isPending: false }),
  useApprove1: () => ({ mutateAsync: approveMock, isPending: false }),
  useReject: () => ({ mutateAsync: rejectMock, isPending: false }),
  useSuspend: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

// jsdom `scrollIntoView` uygulamaz (özel Select listesi kullanır).
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const { ProctorAssignmentsPanel } = await import("./ProctorAssignmentsPanel");
const { ProctorCredentialsSection } = await import("./ProctorCredentialsSection");

const UUID = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";
const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  for (const m of [canMock, panelState, listProctorsState, credentialsState]) m.mockReset();
});

describe("ProctorAssignmentsPanel", () => {
  it("rolleri ve düşürülmüş atamayı (downgraded) uyarıyla listeler", () => {
    canMock.mockReturnValue(true);
    listProctorsState.mockReturnValue(
      ok([
        { id: "a1", staffId: UUID, requestedRole: "ILC_PERSONNEL", effectiveRole: "ILC_PERSONNEL", downgraded: false, assignedAt: "2026-11-09T10:00:00Z" },
        { id: "a2", staffId: "1190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b", requestedRole: "ACCREDITED_EXTERNAL", effectiveRole: "INSTITUTION_STAFF", downgraded: true, assignedAt: "2026-11-09T10:00:00Z" },
      ]),
    );
    renderWithProviders(<ProctorAssignmentsPanel sessionId="s1" />);
    expect(screen.getByText("ILC personeli")).toBeInTheDocument();
    expect(screen.getByText("İstenen rol düştü: Akredite harici gözetmen")).toBeInTheDocument();
    expect(screen.getByText("Akreditasyon geçerli değil")).toBeInTheDocument();
  });

  it("yetkisizde atama düğmesi gizli; boş listede boş durum", () => {
    canMock.mockReturnValue(false);
    listProctorsState.mockReturnValue(ok([]));
    renderWithProviders(<ProctorAssignmentsPanel sessionId="s1" />);
    expect(screen.queryByRole("button", { name: "Gözetmen ata" })).not.toBeInTheDocument();
    expect(screen.getByText("Henüz gözetmen atanmadı")).toBeInTheDocument();
  });

  it("rol seçerek atar; downgraded=true yanıtı açık uyarı verir", async () => {
    canMock.mockReturnValue(true);
    listProctorsState.mockReturnValue(ok([]));
    assignMock.mockResolvedValue({ data: { id: "a3", staffId: UUID, requestedRole: "ACCREDITED_EXTERNAL", effectiveRole: "INSTITUTION_STAFF", downgraded: true } });
    renderWithProviders(<ProctorAssignmentsPanel sessionId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gözetmen ata" }));
    const dialog = screen.getByRole("dialog", { name: "Gözetmen ata" });
    fireEvent.change(within(dialog).getByLabelText(/Personel kimliği/), { target: { value: UUID } });
    fireEvent.click(within(dialog).getByLabelText(/^Rol/));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Akredite harici gözetmen" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Ata" }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith({ sessionId: "s1", data: { staffId: UUID, role: "ACCREDITED_EXTERNAL" } }));
    expect(await screen.findByRole("alert")).toHaveTextContent("akreditasyon geçerli değil");
  });

  it("atama 409 sunucu mesajıyla gösterilir", async () => {
    canMock.mockReturnValue(true);
    listProctorsState.mockReturnValue(ok([]));
    assignMock.mockRejectedValue(Object.assign(new Error("Bu personel bu seansa zaten atanmış"), { status: 409 }));
    renderWithProviders(<ProctorAssignmentsPanel sessionId="s1" />);
    fireEvent.click(screen.getByRole("button", { name: "Gözetmen ata" }));
    const dialog = screen.getByRole("dialog", { name: "Gözetmen ata" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Ata" }));
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent("zaten atanmış"));
  });
});

describe("ProctorCredentialsSection", () => {
  const pending = { id: "c1", staffId: UUID, status: "PENDING", trainedAt: "2026-10-01T00:00:00Z", validUntil: "2099-10-01T00:00:00Z" };

  it("kurum kullanıcısına onay/red/askı düğmeleri gösterilmez, yalnız talep", () => {
    canMock.mockReturnValue(true);
    panelState.mockReturnValue({ role: "STAFF", basePath: "/staff", companyId: "c-1" });
    credentialsState.mockReturnValue(ok([pending, { ...pending, id: "c2", status: "APPROVED" }]));
    renderWithProviders(<ProctorCredentialsSection />);
    expect(screen.getByText(/yalnız akreditasyon talebi oluşturabilirsiniz/)).toBeInTheDocument();
    for (const name of ["Onayla", "Reddet", "Askıya al"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Akreditasyon talep et" })).toBeInTheDocument();
  });

  it("merkez bekleyeni onaylar; 409 (kendi talebi) sunucu mesajıyla gösterilir", async () => {
    canMock.mockReturnValue(true);
    panelState.mockReturnValue({ role: "SUPER_ADMIN", basePath: "/admin", companyId: null });
    credentialsState.mockReturnValue(ok([pending]));
    approveMock.mockRejectedValue(Object.assign(new Error("Talebi açan kişi onaylayamaz"), { status: 409 }));
    renderWithProviders(<ProctorCredentialsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Onayla" }));
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith({ id: "c1" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Talebi açan kişi onaylayamaz");
  });

  it("merkez reddederken gerekçe ister ve gönderir", async () => {
    canMock.mockReturnValue(true);
    panelState.mockReturnValue({ role: "SUPER_ADMIN", basePath: "/admin", companyId: null });
    credentialsState.mockReturnValue(ok([pending]));
    rejectMock.mockResolvedValue({ data: {} });
    renderWithProviders(<ProctorCredentialsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Reddet" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Gerekçe/), { target: { value: "Eğitim belgesi eksik" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Reddet" }));
    await waitFor(() => expect(rejectMock).toHaveBeenCalledWith({ id: "c1", data: { reason: "Eğitim belgesi eksik" } }));
  });

  it("talep: boş form gönderilmez ve zorunlu alan uyarıları görünür (tarih mantığı model testlerinde)", () => {
    canMock.mockReturnValue(true);
    panelState.mockReturnValue({ role: "STAFF", basePath: "/staff", companyId: "c-1" });
    credentialsState.mockReturnValue(ok([]));
    renderWithProviders(<ProctorCredentialsSection />);
    expect(screen.getByText("Henüz akreditasyon kaydı yok")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Akreditasyon talep et" }));
    const dialog = screen.getByRole("dialog", { name: "Akreditasyon talep et" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Talep et" }));
    expect(requestMock).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Eğitim tarihi zorunlu")).toBeInTheDocument();
    expect(within(dialog).getByText("Geçerlilik bitişi zorunlu")).toBeInTheDocument();
    expect(within(dialog).getByText(/Geçerli bir personel kimliği/)).toBeInTheDocument();
  });
});
