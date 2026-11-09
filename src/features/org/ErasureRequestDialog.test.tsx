import { fireEvent, renderWithProviders, screen, waitFor, within } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const submitMock = vi.fn();
vi.mock("@/src/api/generated/erasure-requests/erasure-requests", () => ({ useSubmit: () => ({ mutateAsync: submitMock, isPending: false }) }));

if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}

const { ErasureRequestDialog } = await import("./ErasureRequestDialog");

afterEach(() => {
  vi.clearAllMocks();
});

describe("ErasureRequestDialog (kurum personeli, kendi adayı adına)", () => {
  it("adayın kullanıcı kimliğiyle talep açar; gerçek silme olmadığı yazılıdır", async () => {
    submitMock.mockResolvedValue({ data: {} });
    const onClose = vi.fn();
    renderWithProviders(<ErasureRequestDialog student={{ id: "u-1", firstName: "Ayşe", lastName: "Yılmaz" }} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/hemen silmez/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Açıklama/), { target: { value: "Veli talebi" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Talebi ilet" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledWith({ data: { subjectUserId: "u-1", reason: "Veli talebi" } }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("açık talep varsa 409 mesajı aynen gösterilir ve pencere kapanmaz", async () => {
    submitMock.mockRejectedValue(Object.assign(new Error("Bu kişi için zaten açık bir silme talebi var"), { status: 409 }));
    const onClose = vi.fn();
    renderWithProviders(<ErasureRequestDialog student={{ id: "u-1" }} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Talebi ilet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("zaten açık bir silme talebi var");
    expect(onClose).not.toHaveBeenCalled();
  });
});
