import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AnchorSetView } from "@/src/api/generated/models";

const canMock = vi.fn();
const approveMock = vi.fn();
const addItemMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock(), usePanel: () => ({ basePath: "/staff" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/staff/content/anchor-sets" }));
vi.mock("@/src/components/auth-provider", () => ({ useAuth: () => ({ user: { userId: "u-author", userType: "STAFF" } }) }));
vi.mock("@/src/features/authoring/shared/client", () => ({
  authoringApi: { getQuestion: vi.fn().mockResolvedValue({ code: "RD-1", versionNo: 2 }), listQuestions: vi.fn() },
}));
vi.mock("@/src/features/psychometrics/central", async (importActual) => ({
  ...(await importActual<typeof import("@/src/features/psychometrics/central")>()),
  useCentralRequest: () => ({ ready: true, tenantId: "hq", request: undefined }),
  QuestionVersionPicker: ({ onPick }: { onPick: (row: { versionId: string }) => void }) => (
    <button onClick={() => onPick({ versionId: "qv-9" })}>Seçici: ekle</button>
  ),
}));
vi.mock("@/src/api/generated/anchor-setleri/anchor-setleri", () => ({
  getList2QueryKey: () => ["/psychometrics/anchor-sets"],
  useList2: () => ({ data: { data: [] }, isLoading: false, isError: false }),
  useCreate1: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddItem: () => ({ mutateAsync: addItemMock, isPending: false }),
  useRemoveItem: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSubmitForReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useApprove: () => ({ mutateAsync: approveMock, isPending: false }),
  useReturnToDraft: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRetire1: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRepublish: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { AnchorSetDetail } = await import("./AnchorSetsPage");

const SET: AnchorSetView = {
  id: "set-1",
  bandFrom: "A2",
  bandTo: "B1",
  period: "2026-H1",
  status: "DRAFT",
  createdBy: "u-author",
  createdAt: "2026-11-01T09:00:00Z",
  itemVersionIds: ["qv-1"],
  itemCount: 1,
};

describe("AnchorSetDetail", () => {
  afterEach(() => {
    canMock.mockReset();
    approveMock.mockReset();
    addItemMock.mockReset();
  });

  it("taslakta madde çıkarma/ekleme ve 'İncelemeye gönder' görünür", async () => {
    canMock.mockReturnValue(true);
    renderWithProviders(<AnchorSetDetail set={SET} />);
    expect(screen.getByRole("button", { name: "İncelemeye gönder" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /RD-1 · v2 maddesini çıkar/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seçici: ekle" }));
    await waitFor(() => expect(addItemMock).toHaveBeenCalledWith({ anchorSetId: "set-1", questionVersionId: "qv-9" }));
  });

  it("yetkisiz kullanıcıda yazma düğmeleri gizlidir", () => {
    canMock.mockReturnValue(false);
    renderWithProviders(<AnchorSetDetail set={SET} />);
    expect(screen.queryByRole("button", { name: "İncelemeye gönder" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seçici: ekle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /çıkar/ })).not.toBeInTheDocument();
  });

  it("incelemede onay, dört göz uyarısı ve backend hatası gösterilir; madde düzenleme kapalı", async () => {
    canMock.mockReturnValue(true);
    approveMock.mockRejectedValue(new Error("Yazar kendi anchor setini onaylayamaz (dört göz)"));
    renderWithProviders(<AnchorSetDetail set={{ ...SET, status: "IN_REVIEW" }} />);
    expect(screen.getByText(/dört göz ilkesi gereği/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seçici: ekle" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Onayla" }));
    const dialog = screen.getByRole("dialog", { hidden: true });
    fireEvent.click(Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === "Onayla")!);
    await waitFor(() => expect(approveMock).toHaveBeenCalledWith({ anchorSetId: "set-1" }));
    expect(await screen.findByText(/Yazar kendi anchor setini onaylayamaz/)).toBeInTheDocument();
  });
});
