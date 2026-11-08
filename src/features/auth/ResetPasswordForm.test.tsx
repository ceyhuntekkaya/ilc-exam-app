import { fireEvent, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const resetMock = vi.fn();

vi.mock("@/src/api/generated/auth/auth", () => ({
  useReset: () => ({ mutateAsync: resetMock, isPending: false }),
}));

const { ResetPasswordForm } = await import("./ResetPasswordForm");

function submit(pw: string, again: string) {
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: pw } });
  fireEvent.change(screen.getByLabelText("New password again"), { target: { value: again } });
  fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
}

describe("ResetPasswordForm", () => {
  afterEach(() => resetMock.mockReset());

  it("blocks a mismatching confirmation without calling the API", () => {
    renderWithProviders(<ResetPasswordForm token="tok" />);
    submit("abcdef", "abcdeg");
    expect(screen.getByRole("alert")).toHaveTextContent("not the same");
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("links to the student login on success", async () => {
    resetMock.mockResolvedValue({ data: { message: "ok" } });
    renderWithProviders(<ResetPasswordForm token="tok" />);
    submit("abcdef", "abcdef");
    expect(await screen.findByRole("link", { name: "Go to log in" })).toHaveAttribute("href", "/login/student");
    expect(resetMock).toHaveBeenCalledWith({ data: { token: "tok", newPassword: "abcdef" } });
  });

  it("shows the backend error and a link back to forgot-password on 400", async () => {
    resetMock.mockRejectedValue(Object.assign(new Error("x"), { status: 400, data: { error: "Link süresi dolmuş" } }));
    renderWithProviders(<ResetPasswordForm token="tok" />);
    submit("abcdef", "abcdef");
    expect(await screen.findByRole("alert")).toHaveTextContent("Link süresi dolmuş");
    expect(screen.getByRole("link", { name: "Ask for a new link" })).toHaveAttribute("href", "/forgot-password");
  });
});
