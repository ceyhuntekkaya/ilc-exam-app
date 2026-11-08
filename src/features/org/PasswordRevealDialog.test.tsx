import { fireEvent, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import { PasswordRevealDialog } from "./PasswordRevealDialog";

describe("PasswordRevealDialog", () => {
  it("shows the one-time password with a copy button and closes explicitly", () => {
    HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
    const onClose = vi.fn();
    renderWithProviders(
      <PasswordRevealDialog
        open
        title="Başlangıç parolası"
        studentLabel="Ayşe Kaya"
        username="ayse.kaya"
        password="Xk29-pQ7a"
        hint="Bu parola yalnız şimdi gösterilir."
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Xk29-pQ7a")).toBeInTheDocument();
    expect(screen.getByText(/Kullanıcı adı: ayse.kaya/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kopyala" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kaydettim, kapat" }));
    expect(onClose).toHaveBeenCalled();
  });
});
