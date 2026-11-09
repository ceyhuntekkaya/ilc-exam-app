import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const canMock = vi.fn();
const listMock = vi.fn();
const requeueMock = vi.fn();
const requeueAllMock = vi.fn();

vi.mock("@/src/features/panel/PanelContext", () => ({ useCan: () => canMock() }));
vi.mock("@/src/api/generated/level-report-admin-controller/level-report-admin-controller", () => ({
  useList17: (params: unknown) => listMock(params),
  useRequeue: () => ({ mutateAsync: requeueMock, isPending: false }),
  useRequeueAllDead: () => ({ mutateAsync: requeueAllMock, isPending: false }),
  getList17QueryKey: () => ["/report/level-report-jobs"],
}));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { LevelReportJobsSection } = await import("./LevelReportJobsSection");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });
const DEAD = { jobId: "11111111-aaaa", applicationResultId: "22222222-bbbb", status: "DEAD", kind: "LIVE", attemptCount: 10, lastErrorCode: "RENDER_FAILED", deadAt: "2026-11-09T10:00:00Z" };

afterEach(() => {
  vi.clearAllMocks();
  canMock.mockReset();
  listMock.mockReset();
});

describe("LevelReportJobsSection", () => {
  it("varsayılan DEAD süzgeciyle istekte bulunur ve ölü mektubu hata koduyla listeler", () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([DEAD]));
    renderWithProviders(<LevelReportJobsSection />);
    expect(listMock).toHaveBeenCalledWith({ status: "DEAD", limit: 100 });
    expect(screen.getByText("RENDER_FAILED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yeniden kuyruğa al" })).toBeInTheDocument();
  });

  it("yetkisizde yazma düğmeleri gizlidir", () => {
    canMock.mockReturnValue(false);
    listMock.mockReturnValue(ok([DEAD]));
    renderWithProviders(<LevelReportJobsSection />);
    expect(screen.queryByRole("button", { name: "Yeniden kuyruğa al" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tüm ölü mektupları/ })).not.toBeInTheDocument();
  });

  it("ölü mektup yokken boş durum; toplu düğme görünmez", () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([]));
    renderWithProviders(<LevelReportJobsSection />);
    expect(screen.getByText("Ölü mektup iş yok")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Tüm ölü mektupları/ })).not.toBeInTheDocument();
  });

  it("tek iş ve toplu yeniden kuyruklama doğru ucu çağırır; PENDING süzgecinde yeniden kuyruklama yoktur", async () => {
    canMock.mockReturnValue(true);
    listMock.mockReturnValue(ok([DEAD]));
    requeueMock.mockResolvedValue({ data: {} });
    requeueAllMock.mockResolvedValue({ data: { requeued: 3 } });
    renderWithProviders(<LevelReportJobsSection />);
    fireEvent.click(screen.getByRole("button", { name: "Yeniden kuyruğa al" }));
    await waitFor(() => expect(requeueMock).toHaveBeenCalledWith({ jobId: "11111111-aaaa" }));

    fireEvent.click(screen.getByRole("button", { name: /Tüm ölü mektupları/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Yeniden kuyruğa al" }));
    await waitFor(() => expect(requeueAllMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Bekleyen" }));
    expect(listMock).toHaveBeenLastCalledWith({ status: "PENDING", limit: 100 });
    expect(screen.queryByRole("button", { name: /Tüm ölü mektupları/ })).not.toBeInTheDocument();
  });
});
