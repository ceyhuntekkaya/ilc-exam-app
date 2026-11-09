import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MappingState, OutcomeNode } from "@/src/api/generated/models";

const canMock = vi.fn();
const mapMock = vi.fn();
const setParentMock = vi.fn();
let tenantHq = false;
let mappingState: MappingState = { mapped: false };

const TREE: OutcomeNode[] = [
  {
    id: "r1",
    framework: "MEB",
    code: "MEB.1",
    description: "Dinleme",
    children: [{ id: "c1", framework: "MEB", code: "MEB.1.1", description: "Ana fikri bulur", parentId: "r1", children: [] }],
  },
];

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock() }));
vi.mock("@/src/features/authoring/shared/tenant", () => ({ useAuthoringTenant: () => ({ tenant: { id: "t1", contentHq: tenantHq } }) }));
vi.mock("@/src/features/authoring/shared/client", () => ({ authoringApi: { outcomeLabels: vi.fn().mockResolvedValue([{ id: "x", code: "ILC.R.1", description: "Okuma" }]) } }));
vi.mock("@/src/features/psychometrics/central", async (importActual) => ({
  ...(await importActual<typeof import("@/src/features/psychometrics/central")>()),
  useCentralRequest: () => ({ ready: true, tenantId: "t1", request: undefined }),
}));
vi.mock("@/src/api/generated/kazanım-ağacı/kazanım-ağacı", () => ({
  getMappingQueryKey: (id: string) => [`/authoring/outcome-tree/${id}/mapping`],
  useTree: () => ({ data: { data: TREE }, isLoading: false, isError: false, isSuccess: true }),
  useAncestors: () => ({ data: { data: [{ id: "r1", code: "MEB.1" }] } }),
  useMapping: () => ({ data: { data: mappingState }, isLoading: false, isError: false }),
  useSetParent: () => ({ mutateAsync: setParentMock, isPending: false }),
  useMap: () => ({ mutateAsync: mapMock, isPending: false }),
  useUnmap: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { OutcomeTreePage } = await import("./OutcomeTreePage");
const UUID = "0190a1b2-c3d4-7e5f-8a6b-1c2d3e4f5a6b";

describe("OutcomeTreePage", () => {
  afterEach(() => {
    canMock.mockReset();
    mapMock.mockReset();
    setParentMock.mockReset();
    tenantHq = false;
    mappingState = { mapped: false };
  });

  it("ağacı gösterir; seçilen kazancın ayrıntısı açılır", () => {
    canMock.mockReturnValue(true);
    renderWithProviders(<OutcomeTreePage />);
    expect(screen.getByText("Ana fikri bulur")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Ana fikri bulur"));
    expect(screen.getByRole("heading", { name: "MEB.1.1" })).toBeInTheDocument();
    expect(screen.getByText("Eşlenmedi")).toBeInTheDocument();
  });

  it("yetkisiz kullanıcıda yazma düğmeleri gizlidir", () => {
    canMock.mockReturnValue(false);
    renderWithProviders(<OutcomeTreePage />);
    fireEvent.click(screen.getByText("Ana fikri bulur"));
    expect(screen.queryByRole("button", { name: "Kaydet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eşle" })).not.toBeInTheDocument();
  });

  it("geçersiz hedef kimliğiyle eşleme gönderilmez; geçerliyle gönderilir", async () => {
    canMock.mockReturnValue(true);
    mapMock.mockResolvedValue({ data: {} });
    renderWithProviders(<OutcomeTreePage />);
    fireEvent.click(screen.getByText("Ana fikri bulur"));
    fireEvent.click(screen.getByRole("button", { name: "Eşle" }));
    expect(await screen.findByText(/kimliğini \(UUID\) girin/)).toBeInTheDocument();
    expect(mapMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Merkez kazanım kimliği/), { target: { value: UUID } });
    fireEvent.change(screen.getByLabelText(/Eşleme türü/), { target: { value: "EXACT" } });
    fireEvent.click(screen.getByRole("button", { name: "Eşle" }));
    await waitFor(() => expect(mapMock).toHaveBeenCalledWith({ outcomeId: "c1", data: { targetOutcomeId: UUID, mappingType: "EXACT" } }));
  });

  it("zaten eşlenmişse eşleme bilgisini ve kaldırma düğmesini gösterir", async () => {
    canMock.mockReturnValue(true);
    mappingState = { mapped: true, mapping: { id: "m1", targetOutcomeId: "x", mappingType: "BROADER", confidence: 0.8 } };
    renderWithProviders(<OutcomeTreePage />);
    fireEvent.click(screen.getByText("Ana fikri bulur"));
    expect(screen.getByText("Eşlendi")).toBeInTheDocument();
    expect(await screen.findByText("ILC.R.1 — Okuma")).toBeInTheDocument();
    expect(screen.getByText("Merkez kazanım daha geniş")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eşlemeyi kaldır" })).toBeInTheDocument();
  });

  it("merkez kiracıda eşleme formu yerine açıklama gösterilir", () => {
    canMock.mockReturnValue(true);
    tenantHq = true;
    renderWithProviders(<OutcomeTreePage />);
    fireEvent.click(screen.getByText("Ana fikri bulur"));
    expect(screen.getByText(/Merkez kazanımı kendisi merkezî çerçevedir/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eşle" })).not.toBeInTheDocument();
  });
});
