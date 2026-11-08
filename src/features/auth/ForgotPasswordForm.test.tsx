import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const forgotMock = vi.fn();

vi.mock("@/src/api/generated/auth/auth", () => ({
  useForgot: () => ({ mutateAsync: forgotMock, isPending: false }),
}));

const { ForgotPasswordForm, FORGOT_NEUTRAL_MESSAGE } = await import("./ForgotPasswordForm");

function submit(email: string) {
  fireEvent.change(screen.getByLabelText("Your e-mail address"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send the link" }));
}

describe("ForgotPasswordForm", () => {
  afterEach(() => forgotMock.mockReset());

  it("always shows the same neutral confirmation", async () => {
    forgotMock.mockResolvedValue({ data: { message: "whatever the server says" } });
    renderWithProviders(<ForgotPasswordForm />);
    submit("a@b.co");
    expect(await screen.findByText(FORGOT_NEUTRAL_MESSAGE)).toBeInTheDocument();
    expect(forgotMock).toHaveBeenCalledWith({ data: { email: "a@b.co" } });
  });

  it("asks to try later on 429", async () => {
    forgotMock.mockRejectedValue(Object.assign(new Error("rate limit exceeded"), { status: 429 }));
    renderWithProviders(<ForgotPasswordForm />);
    submit("a@b.co");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("try again later"));
    expect(screen.queryByText(FORGOT_NEUTRAL_MESSAGE)).not.toBeInTheDocument();
  });
});
