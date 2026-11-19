import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DistributionRow } from "@/src/api/generated/models";

const cancelMutate = vi.fn();
const rescheduleMutate = vi.fn();
const renameMutate = vi.fn();
const removeMutate = vi.fn();
const closeMutate = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  getDetailQueryKey: (id: string) => [`/my-company/distributions/${id}`],
  getList6QueryKey: () => ["/my-company/distributions"],
  getCandidatesQueryKey: (id: string) => [`/my-company/distributions/${id}/candidates`],
  useCloseDistribution: () => ({ mutate: closeMutate, isPending: false }),
  useCancelDistribution: () => ({ mutate: cancelMutate, isPending: false }),
  useRescheduleDistribution: () => ({ mutate: rescheduleMutate, isPending: false }),
  useRenameDistribution: () => ({ mutate: renameMutate, isPending: false }),
  useDeleteDraftDistribution: () => ({ mutate: removeMutate, isPending: false }),
}));

const { DistributionManageActions } = await import("./DistributionManageActions");

// jsdom <dialog>.showModal/close desteklemez; ConfirmDialog/FormDialog bunları çağırır.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const OPEN: DistributionRow = {
  id: "dist-1",
  name: "Kasım Deneme Dağıtımı",
  status: "OPEN",
  mode: "OPEN_WINDOW",
  windowOpensAt: "2099-11-20T07:00:00Z",
  windowClosesAt: "2099-11-20T11:00:00Z",
};

describe("DistributionManageActions", () => {
  afterEach(() => vi.clearAllMocks());

  it("açık dağıtımda ad, tarih ve iptal düğmeleri var, silme yok", () => {
    renderWithProviders(<DistributionManageActions distribution={OPEN} />);

    expect(screen.getByRole("button", { name: "Adı değiştir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tarihleri değiştir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dağıtımı iptal et" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Taslağı sil" })).toBeNull();
  });

  it("taslakta silme düğmesi var, tarih değiştirme yok", () => {
    renderWithProviders(<DistributionManageActions distribution={{ ...OPEN, status: "DRAFT" }} />);

    expect(screen.getByRole("button", { name: "Taslağı sil" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tarihleri değiştir" })).toBeNull();
  });

  it("iptal edilmiş dağıtımda hiçbir düğme çizilmez", () => {
    renderWithProviders(<DistributionManageActions distribution={{ ...OPEN, status: "CANCELLED" }} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("iptal onaylanana kadar istek gitmez; onayda dağıtım kimliğiyle çağrılır", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DistributionManageActions distribution={OPEN} />);

    await user.click(screen.getByRole("button", { name: "Dağıtımı iptal et" }));
    expect(cancelMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/hakkı ve sonucu korunur/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "İptal et" }));
    expect(cancelMutate).toHaveBeenCalledWith({ distributionId: "dist-1" });
  });

  it("K4: açık dağıtımda 'Teslim ettir' onaylanınca dağıtım kimliğiyle kapatma isteği gider", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DistributionManageActions distribution={OPEN} />);

    await user.click(screen.getByRole("button", { name: "Teslim ettir" }));
    expect(closeMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/verdiği bütün cevaplar korunur/)).toBeInTheDocument();

    const buttons = screen.getAllByRole("button", { name: "Teslim ettir" });
    await user.click(buttons[buttons.length - 1]);
    expect(closeMutate).toHaveBeenCalledWith({ distributionId: "dist-1" });
  });

  it("taslakta 'Teslim ettir' yoktur", () => {
    renderWithProviders(<DistributionManageActions distribution={{ ...OPEN, status: "DRAFT" }} />);

    expect(screen.queryByRole("button", { name: "Teslim ettir" })).toBeNull();
  });
});
