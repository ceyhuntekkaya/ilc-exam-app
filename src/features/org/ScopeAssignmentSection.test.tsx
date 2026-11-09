import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const assignMock = vi.fn();
const removeMock = vi.fn();
const deleteScopeMock = vi.fn();
const orgUnitsMock = vi.fn();
const refetchMock = vi.fn();

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

vi.mock("@/src/api/generated/org-units/org-units", () => ({
  useList19: (companyId: string, options?: unknown) => orgUnitsMock(companyId, options),
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
const OTHER_UNIT = "cccccccc-1111-2222-3333-444444444444";
const ROOT_UNIT = "dddddddd-1111-2222-3333-444444444444";
// Ön-sıra: kök (parentId yok) > UNIT "Fen Bölümü" > NEW_UNIT "Fizik"; kök > OTHER_UNIT "Sosyal".
const UNITS = [
  { id: ROOT_UNIT, name: "Merkez Kurum", unitType: "ROOT", status: "ACTIVE", depth: 0, childCount: 2 },
  { id: UNIT, parentId: ROOT_UNIT, name: "Fen Bölümü", code: "FEN", unitType: "DEPARTMENT", status: "ACTIVE", depth: 1, childCount: 1 },
  { id: NEW_UNIT, parentId: UNIT, name: "Fizik", unitType: "TEAM", status: "ACTIVE", depth: 2, childCount: 0 },
  { id: OTHER_UNIT, parentId: ROOT_UNIT, name: "Sosyal", unitType: "DEPARTMENT", status: "PASSIVE", depth: 1, childCount: 0 },
];
function units(state: Record<string, unknown> = {}) {
  orgUnitsMock.mockReturnValue({
    data: { data: { items: UNITS, total: UNITS.length, truncated: false } },
    isLoading: false,
    error: null,
    refetch: refetchMock,
    ...state,
  });
}
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

function setup(can = true, unitState: Record<string, unknown> = {}) {
  canMock.mockReturnValue(can);
  units(unitState);
  return renderWithProviders(<ScopeAssignmentSection companyId="c-1" staff={STAFF} onChanged={vi.fn()} />);
}

afterEach(() => {
  vi.clearAllMocks();
  [canMock, assignMock, removeMock, deleteScopeMock, orgUnitsMock, refetchMock].forEach((m) => m.mockReset());
});

describe("ScopeAssignmentSection", () => {
  it("izin yoksa satırlar görünür ama atama/kaldırma/silme düğmeleri gizlenir", () => {
    setup(false);
    expect(screen.getByTestId("scope-s-none")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Birim ata|Birimi değiştir|Birimi kaldır|Satırı sil/ })).not.toBeInTheDocument();
    expect(screen.getByText(/staff:assign_scope/)).toBeInTheDocument();
    // İzin yokken uç çağrılmaz (boşuna 403 üretilmez).
    expect(orgUnitsMock).toHaveBeenCalledWith("c-1", { query: { enabled: false, retry: false } });
  });

  it("satırlarda birim kimliği yerine birim adı ve kodu gösterilir; listede olmayan birim kısa kimlik + tam UUID title ile", () => {
    const staff = { ...STAFF, scopes: [...STAFF.scopes, { id: "s-miss", roleName: "Öğretmen", orgUnitId: "eeeeeeee-1111-2222-3333-444444444444" }] };
    canMock.mockReturnValue(true);
    units();
    renderWithProviders(<ScopeAssignmentSection companyId="c-1" staff={staff} />);
    const branch = screen.getByTestId("scope-s-branch");
    expect(within(branch).getByText("Fen Bölümü")).toBeInTheDocument();
    expect(within(branch).getByText("(FEN)")).toBeInTheDocument();
    expect(within(branch).queryByText("aaaaaaaa")).not.toBeInTheDocument();
    const miss = screen.getByTestId("scope-s-miss");
    expect(within(miss).getByText("eeeeeeee")).toHaveAttribute("title", "eeeeeeee-1111-2222-3333-444444444444");
  });

  it("liste yüklenirken satırlar kısa kimlikle gösterilir", () => {
    setup(true, { data: undefined, isLoading: true });
    expect(within(screen.getByTestId("scope-s-branch")).getByText("aaaaaaaa")).toHaveAttribute("title", UNIT);
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

  function openPicker(row = "s-none") {
    fireEvent.click(within(screen.getByTestId(`scope-${row}`)).getByRole("button", { name: /Birim ata|Birimi değiştir/ }));
  }

  it("birim seçilmeden gönderilmez; seçilen birimin kimliğiyle PUT gövdesi (sezon boşsa alan yok) gider", async () => {
    assignMock.mockResolvedValue({ data: {} });
    setup();
    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    expect(assignMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Bir birim seçin.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Fizik/ }));
    expect(screen.getByTestId("unit-selected")).toHaveTextContent("Seçili: Fizik");
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith({ id: "c-1", uid: "staff-1", sid: "s-none", data: { orgUnitId: NEW_UNIT } }));
  });

  it("seçici birimleri ağaç sırasıyla, depth'e göre girintili; ad + kod ve Kök/Pasif rozetleriyle listeler", () => {
    setup();
    openPicker();
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Merkez Kurum" + "Kök", "Fen BölümüFEN", "Fizik", "SosyalPasif"]);
    const pad = (i: number) => parseFloat(options[i].style.paddingLeft);
    expect(pad(0)).toBeLessThan(pad(1));
    expect(pad(1)).toBeLessThan(pad(2));
    expect(pad(1)).toBe(pad(3));
  });

  it("parentId'si olmayan birim ağacın tepesi olarak listelenir ve seçilebilir; kök kuralını sunucu uygular", async () => {
    assignMock.mockRejectedValue(Object.assign(new Error("Kök birim atanamaz"), { status: 400 }));
    setup();
    openPicker();
    fireEvent.click(screen.getByRole("option", { name: /Merkez Kurum/ }));
    fireEvent.click(screen.getByRole("button", { name: "Birimi ata" }));
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith(expect.objectContaining({ data: { orgUnitId: ROOT_UNIT } })));
    expect(await screen.findByText("Kök birim atanamaz")).toBeInTheDocument();
  });

  it("izinli alt ağacın tepesi (parentId yok, derinlik > 0) ve üst birimi listede olmayan birim sorunsuz listelenir", () => {
    setup(true, { data: { data: { items: [{ id: UNIT, name: "Fen Bölümü", depth: 1 }, { id: NEW_UNIT, parentId: UNIT, name: "Fizik", depth: 2 }], total: 2 } } });
    openPicker();
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(2);
  });

  it("değiştirmede mevcut birim seçili gelir", () => {
    setup();
    openPicker("s-branch");
    expect(screen.getByRole("option", { name: /Fen Bölümü/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("unit-selected")).toHaveTextContent("Seçili: Fen Bölümü (FEN)");
  });

  it("arama süzgeci ad/koda göre süzer, eşleşenin üst birimleri bağlam olarak kalır; eşleşme yoksa bildirir", () => {
    setup();
    openPicker();
    const search = screen.getByRole("searchbox", { name: "Birim ara" });
    fireEvent.change(search, { target: { value: "fizik" } });
    expect(within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Merkez KurumKök", "Fen BölümüFEN", "Fizik"]);
    fireEvent.change(search, { target: { value: "fen" } });
    expect(screen.getByRole("option", { name: /Fen Bölümü/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Sosyal/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "yokboyle" } });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText("Aramanızla eşleşen birim yok.")).toBeInTheDocument();
  });

  it("truncated=true iken sunucu uyarısı gösterilir; uyarı yoksa genel uyarı", () => {
    setup(true, { data: { data: { items: UNITS, total: 2500, truncated: true, warning: "Birim sayısı üst sınırı aştı; liste kesildi" } } });
    openPicker();
    expect(screen.getByRole("status")).toHaveTextContent("Birim sayısı üst sınırı aştı; liste kesildi");
  });

  it("truncated=true ve uyarı yoksa genel kesilme uyarısı", () => {
    setup(true, { data: { data: { items: UNITS, total: 4, truncated: true } } });
    openPicker();
    expect(screen.getByRole("status")).toHaveTextContent(/kesildi/);
  });

  it("truncated değilse uyarı yok", () => {
    setup();
    openPicker();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("liste yüklenirken yükleniyor durumu gösterilir", () => {
    setup(true, { data: undefined, isLoading: true });
    openPicker();
    expect(screen.getByRole("status")).toHaveTextContent("Birimler yükleniyor");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("liste boşsa açıklayıcı boş durum gösterilir", () => {
    setup(true, { data: { data: { items: [], total: 0, truncated: false } } });
    openPicker();
    expect(screen.getByText(/Seçilebilir birim yok/)).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("liste 403 ile yüklenemezse sunucu mesajı aynen gösterilir ve tekrar denenebilir", () => {
    const message = "Bu işlem için yetkiniz yok: staff:assign_scope";
    setup(true, { data: undefined, error: Object.assign(new Error(message), { status: 403 }) });
    openPicker();
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    fireEvent.click(screen.getByRole("button", { name: "Tekrar dene" }));
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, "Kendi kapsamınızı aşan atama yapılamaz"],
    [400, "Kök birim atanamaz; kurum geneli kapsam için satırı birimsiz bırakın"],
  ])("atama %i hatasında sunucu mesajı aynen gösterilir", async (status, message) => {
    assignMock.mockRejectedValue(Object.assign(new Error(message), { status }));
    setup();
    fireEvent.click(within(screen.getByTestId("scope-s-none")).getByRole("button", { name: "Birim ata" }));
    fireEvent.click(screen.getByRole("option", { name: /Fizik/ }));
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
