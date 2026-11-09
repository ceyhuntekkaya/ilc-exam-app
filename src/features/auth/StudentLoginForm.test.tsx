import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const loginMock = vi.fn();
const establishSession = vi.fn();

vi.mock("@/src/api/generated/auth/auth", () => ({
  useStudentLogin: () => ({ mutateAsync: loginMock, isPending: false }),
}));
vi.mock("@/src/components/auth-provider", () => ({
  useAuth: () => ({ establishSession }),
}));

const { StudentLoginForm, loginErrorMessage } = await import("./StudentLoginForm");

function fill(username: string, password: string) {
  fireEvent.change(screen.getByLabelText("Your username"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Your password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: /log in/i }));
}

describe("StudentLoginForm", () => {
  afterEach(() => {
    loginMock.mockReset();
    establishSession.mockReset();
  });

  it("has a password field and a forgot-password link", () => {
    renderWithProviders(<StudentLoginForm />);
    const field = screen.getByLabelText("Your password");
    expect(field).toHaveAttribute("type", "password");
    expect(field).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Kayıt ol" })).toHaveAttribute("href", "/register");
  });

  it("shows the success note after a password change", () => {
    renderWithProviders(<StudentLoginForm passwordChanged />);
    expect(screen.getByText("Password changed. Please log in.")).toBeInTheDocument();
  });

  it("sends username and password and opens the session with the must-change flag", async () => {
    loginMock.mockResolvedValue({ data: { accessToken: "a", userType: "STUDENT", mustChangePassword: true } });
    renderWithProviders(<StudentLoginForm />);
    fill(" ayse ", "secret1");
    await waitFor(() => expect(establishSession).toHaveBeenCalled());
    expect(loginMock).toHaveBeenCalledWith({ data: { username: "ayse", password: "secret1" } });
    expect(establishSession).toHaveBeenCalledWith("a", "STUDENT", undefined, { mustChangePassword: true });
  });

  it("shows a friendly message for a wrong password (401)", async () => {
    loginMock.mockRejectedValue(Object.assign(new Error("Geçersiz kimlik bilgileri"), { status: 401 }));
    renderWithProviders(<StudentLoginForm />);
    fill("ayse", "wrong");
    expect(await screen.findByRole("alert")).toHaveTextContent("username or password is not right");
    expect(establishSession).not.toHaveBeenCalled();
  });

  it("maps 429 to a wait message", () => {
    expect(loginErrorMessage(429)).toMatch(/Too many tries/);
    expect(loginErrorMessage(500)).toMatch(/could not log you in/);
  });
});
