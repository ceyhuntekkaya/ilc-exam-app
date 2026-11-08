import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const changeMock = vi.fn();
const signOut = vi.fn();
const replace = vi.fn();
let authUser: { userType: string } | null = { userType: "STUDENT" };

vi.mock("@/src/api/generated/auth/auth", () => ({
  useChangePassword: () => ({ mutateAsync: changeMock, isPending: false }),
}));
vi.mock("@/src/components/auth-provider", () => ({
  useAuth: () => ({ user: authUser, loading: false, signOut }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const { ChangePasswordForm } = await import("./ChangePasswordForm");

function submit(oldPw: string, next: string, again: string) {
  fireEvent.change(screen.getByLabelText("Current password"), { target: { value: oldPw } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("New password again"), { target: { value: again } });
  fireEvent.click(screen.getByRole("button", { name: "Save new password" }));
}

describe("ChangePasswordForm", () => {
  afterEach(() => {
    changeMock.mockReset();
    signOut.mockReset();
    replace.mockReset();
    authUser = { userType: "STUDENT" };
  });

  it("rejects a new password equal to the old one on the client", () => {
    renderWithProviders(<ChangePasswordForm />);
    submit("same123", "same123", "same123");
    expect(screen.getByRole("alert")).toHaveTextContent("different from the old one");
    expect(changeMock).not.toHaveBeenCalled();
  });

  it("signs out to the student login with ?changed=1 after success", async () => {
    changeMock.mockResolvedValue({ data: undefined, status: 204 });
    renderWithProviders(<ChangePasswordForm />);
    submit("old1234", "new1234", "new1234");
    await waitFor(() => expect(signOut).toHaveBeenCalledWith("/login/student?changed=1"));
    expect(changeMock).toHaveBeenCalledWith({ data: { oldPassword: "old1234", newPassword: "new1234" } });
  });

  it("shows the backend error text on 400", async () => {
    changeMock.mockRejectedValue(Object.assign(new Error("x"), { status: 400, data: { error: "Mevcut parola hatalı" } }));
    renderWithProviders(<ChangePasswordForm />);
    submit("old1234", "new1234", "new1234");
    expect(await screen.findByRole("alert")).toHaveTextContent("Mevcut parola hatalı");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("sends staff back to the staff login", async () => {
    authUser = { userType: "STAFF" };
    changeMock.mockResolvedValue({ data: undefined, status: 204 });
    renderWithProviders(<ChangePasswordForm />);
    fireEvent.change(screen.getByLabelText("Mevcut parola"), { target: { value: "old1234" } });
    fireEvent.change(screen.getByLabelText("Yeni parola"), { target: { value: "new1234" } });
    fireEvent.change(screen.getByLabelText("Yeni parola (tekrar)"), { target: { value: "new1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Parolayı kaydet" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledWith("/login?changed=1"));
  });

  it("redirects an unsigned visitor to login", async () => {
    authUser = null;
    renderWithProviders(<ChangePasswordForm />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login/student"));
  });
});
