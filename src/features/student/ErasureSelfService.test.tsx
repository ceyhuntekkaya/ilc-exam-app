import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const mineMock = vi.fn();
const submitMock = vi.fn();

vi.mock("@/src/api/generated/erasure-requests/erasure-requests", () => ({
  useMine: () => mineMock(),
  useSubmit: () => ({ mutateAsync: submitMock, isPending: false }),
  getMineQueryKey: () => ["/erasure-requests/mine"],
}));

const { ErasureSelfService } = await import("./ErasureSelfService");

const state = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  mineMock.mockReset();
});

describe("ErasureSelfService", () => {
  it("talep açmanın gerçek silmeyi tetiklemediğini açıkça yazar; talep yokken form görünür", () => {
    mineMock.mockReturnValue(state([]));
    renderWithProviders(<ErasureSelfService />);
    expect(screen.getByText(/does not delete your data immediately/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request deletion" })).toBeInTheDocument();
  });

  it("gönderince gerekçesiz de iletilir (boş alan gönderilmez) ve 'talebiniz alındı' görünür", async () => {
    mineMock.mockReturnValue(state([]));
    submitMock.mockResolvedValue({ data: {} });
    renderWithProviders(<ErasureSelfService />);
    fireEvent.click(screen.getByRole("button", { name: "Request deletion" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledWith({ data: {} }));
    expect(await screen.findByRole("status")).toHaveTextContent("Your request was received and will be assessed by the centre");
  });

  it("açıklamayla gönderir", async () => {
    mineMock.mockReturnValue(state([]));
    submitMock.mockResolvedValue({ data: {} });
    renderWithProviders(<ErasureSelfService />);
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: " Sınavdan çekildim " } });
    fireEvent.click(screen.getByRole("button", { name: "Request deletion" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledWith({ data: { reason: "Sınavdan çekildim" } }));
  });

  it("açık talep varken form yoktur, durum açıklaması gösterilir", () => {
    mineMock.mockReturnValue(state([{ id: "r1", status: "RECEIVED", createdAt: "2026-11-01T10:00:00Z" }]));
    renderWithProviders(<ErasureSelfService />);
    expect(screen.queryByRole("button", { name: "Request deletion" })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Your request was received and will be assessed by the centre/).length).toBeGreaterThan(0);
  });

  it("409 (zaten açık talep) sunucu mesajıyla gösterilir", async () => {
    mineMock.mockReturnValue(state([]));
    submitMock.mockRejectedValue(Object.assign(new Error("Bu kişi için zaten açık bir silme talebi var"), { status: 409 }));
    renderWithProviders(<ErasureSelfService />);
    fireEvent.click(screen.getByRole("button", { name: "Request deletion" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Bu kişi için zaten açık bir silme talebi var");
  });

  it("ertelenen ve reddedilen talep açıklamaları", () => {
    mineMock.mockReturnValue(
      state([
        { id: "r2", status: "REJECTED", rejectedReason: "Kimlik doğrulanamadı", createdAt: "2026-10-01T10:00:00Z" },
        { id: "r3", status: "COMPLETED", createdAt: "2026-09-01T10:00:00Z" },
      ]),
    );
    renderWithProviders(<ErasureSelfService />);
    expect(screen.getByText(/Reason: Kimlik doğrulanamadı/)).toBeInTheDocument();
    expect(screen.getByText(/records that must be kept by law/)).toBeInTheDocument();
  });
});
