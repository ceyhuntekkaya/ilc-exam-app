import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const assignMock = vi.fn();
const removeMock = vi.fn();
const deleteScopeMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ role: "SUPER_ADMIN", basePath: "/admin" }) }));
vi.mock("@/src/api/generated/staff-unit-scope/staff-unit-scope", () => ({
  useAssign: () => ({ mutateAsync: assignMock, isPending: false }),
  useRemove: () => ({ mutateAsync: removeMock, isPending: false }),
}));
vi.mock("@/src/api/generated/admin-companies/admin-companies", () => ({
  useDeleteScope: () => ({ mutateAsync: deleteScopeMock, isPending: false }),
  useInstitutes: () => ({ data: { data: [{ id: "inst-1", name: "Merkez Kampüs" }] } }),
  useYears: () => ({ data: { data: [{ id: "year-1", name: "2026-2027" }] } }),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { ScopeAssignmentSection } = await import("./ScopeAssignmentSection");

const UNIT = "aaaaaaaa-1111-2222-3333-444444444444";
const NEW_UNIT = "bbbbbbbb-1111-2222-3333-444444444444";
const STAFF = {
  id: "staff-1",
  firstName: "Ayşe",
  lastName: "Yılmaz",
  scopes: [
    { id: "s-none", roleName: "Öğretmen" },
    { id: "s-branch", roleName: "Müdür", instituteId: "inst-1", branchId: "br-1", orgUnitId: UNIT },
    { id: "s-only", roleName: "Birim Yöneticisi", orgUnitId: UNIT },
  ],
};

function setup(can = true) {
  canMock.mockReturnValue(can);
  return renderWithProviders(<ScopeAssignmentSection companyId="c-1" staff={STAFF} onChanged={vi.fn()} />);
}

afterEach(() => {
  vi.clearAllMocks();
  [canMock, assignMock, removeMock, deleteScopeMock].forEach((m) => m.mockReset());
});

describe("ScopeAssignmentSection", () => {
  it("izin yoksa satırlar görünür ama atama/kaldırma/silme düğmeleri gizlenir", () => {
    setup(false);
    expect(screen.getByTestId("scope-s-none")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Birim ata|Birimi değiştir|Birimi kaldır|Satırı sil/ })).not.toBeInTheDocument();
    expect(screen.getByText(/staff:assign_scope/)).toBeInTheDocument();
  });

  it("normal satırda 'Birimi kaldır' var; yalnız-birim satırda yok, uyarı ve 'Satırı sil' var", () => {
    setup();
    const branch = screen.getByTestId("scope-s-branch");
    expect(within(branch).getByRole("button", { name: "Birimi kaldır" })).toBeInTheDocument();
    expect(within(branch).getByText("Merkez Kampüs", { exact: false })).toBeInTheDocument();
    const only = screen.getByTestId("scope-s-only");
    expect(within(only).queryByRole("button", { name: "Birimi kaldır" })).not.toBeInTheDocument();
    expect(within(only).getByText("Yalnız birim")).toBeInTheDocument();
    expect(within(only).getByRole("note")).toHaveTextContent(/kurum geneline AÇAR/);
    expect(within(only).getByRole("button", { name: "Satırı sil" })).toBeInTheDocument();
  });

  it("geçersiz birim kimliğiyle gönderilmez; geçerli kimlikle PUT gövdesi (sezon boşsa alan yok) gider", async () => {
    assignMock.mockResolvedValue({ data: {} });
    setup();
    fireEvent.click(within(screen.getByTestId("scope-s-none")).getByRole("button", { name: "Birim ata" }));
    const input = screen.getByPlaceholderText("00000000-0000-0000-0000-000000000000");
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    expect(assignMock).not.toHaveBeenCalled();
    expect(await screen.findByText(/geçerli bir UUID/)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: NEW_UNIT } });
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith({ id: "c-1", uid: "staff-1", sid: "s-none", data: { orgUnitId: NEW_UNIT } }));
  });

  it.each([
    [403, "Kendi kapsamınızı aşan atama yapılamaz"],
    [400, "Kök birim atanamaz; kurum geneli kapsam için satırı birimsiz bırakın"],
  ])("atama %i hatasında sunucu mesajı aynen gösterilir", async (status, message) => {
    assignMock.mockRejectedValue(Object.assign(new Error(message), { status }));
    setup();
    fireEvent.click(within(screen.getByTestId("scope-s-none")).getByRole("button", { name: "Birim ata" }));
    fireEvent.change(screen.getByPlaceholderText("00000000-0000-0000-0000-000000000000"), { target: { value: NEW_UNIT } });
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("birim kaldırma 409'unda sunucu mesajı satırda aynen gösterilir", async () => {
    const message = "Bu satır yalnız birim kapsamı taşıyor; birimi kaldırmak kurum geneline açar. Kapsamı kaldırmak için satırı silin";
    removeMock.mockRejectedValue(Object.assign(new Error(message), { status: 409 }));
    setup();
    fireEvent.click(within(screen.getByTestId("scope-s-branch")).getByRole("button", { name: "Birimi kaldır" }));
    expect(await within(screen.getByTestId("scope-s-branch")).findByRole("alert")).toHaveTextContent(message);
    expect(removeMock).toHaveBeenCalledWith({ id: "c-1", uid: "staff-1", sid: "s-branch" });
  });

  it("'Satırı sil' onaydan sonra mevcut satır silme ucunu çağırır", async () => {
    deleteScopeMock.mockResolvedValue({});
    setup();
    fireEvent.click(within(screen.getByTestId("scope-s-only")).getByRole("button", { name: "Satırı sil" }));
    expect(deleteScopeMock).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog", { name: "Kapsam satırı silinsin mi?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Satırı sil" }));
    await waitFor(() => expect(deleteScopeMock).toHaveBeenCalledWith({ id: "c-1", uid: "staff-1", sid: "s-only" }));
  });
});
