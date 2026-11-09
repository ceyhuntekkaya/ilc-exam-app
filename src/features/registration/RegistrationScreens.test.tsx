import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const registerMock = vi.fn();
const verifyMock = vi.fn();
const consentMock = vi.fn();

vi.mock("@/src/api/generated/public-registration-controller/public-registration-controller", () => ({
  useRegister: () => ({ mutateAsync: registerMock, isPending: false }),
  useVerify: () => ({ mutateAsync: verifyMock, isPending: false }),
  useGuardianConsent: () => ({ mutateAsync: consentMock, isPending: false }),
}));

const { RegisterForm } = await import("./RegisterForm");
const { VerifyEmailForm } = await import("./VerifyEmailForm");
const { GuardianConsentView } = await import("./GuardianConsentView");
const { REGISTER_NEUTRAL_MESSAGE } = await import("./registrationModel");

function fillAdult() {
  fireEvent.change(screen.getByLabelText("Adınız"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Soyadınız"), { target: { value: "Yılmaz" } });
  fireEvent.change(screen.getByLabelText("E-posta adresiniz"), { target: { value: "ada@ornek.com" } });
  fireEvent.change(screen.getByLabelText("Doğum tarihiniz"), { target: { value: "1990-03-04" } });
}

describe("RegisterForm", () => {
  afterEach(() => {
    registerMock.mockReset();
    verifyMock.mockReset();
    consentMock.mockReset();
  });

  it("formu isteğe çevirir ve yanıttan bağımsız aynı genel mesajı gösterir", async () => {
    registerMock.mockResolvedValue({ data: { message: "sunucu ne derse desin" } });
    renderWithProviders(<RegisterForm />);
    fillAdult();
    fireEvent.click(screen.getByRole("button", { name: "Kayıt ol" }));
    expect(await screen.findByText(REGISTER_NEUTRAL_MESSAGE)).toBeInTheDocument();
    expect(registerMock).toHaveBeenCalledWith({
      data: { email: "ada@ornek.com", firstName: "Ada", lastName: "Yılmaz", birthDate: "1990-03-04" },
    });
  });

  it("geçersiz formda istek göndermez", () => {
    renderWithProviders(<RegisterForm />);
    fireEvent.click(screen.getByRole("button", { name: "Kayıt ol" }));
    expect(registerMock).not.toHaveBeenCalled();
    expect(screen.getByText("Adınızı yazın.")).toBeInTheDocument();
  });

  it("reşit olmayan doğum tarihinde veli e-postası alanını açar ve ister", async () => {
    registerMock.mockResolvedValue({ data: {} });
    renderWithProviders(<RegisterForm />);
    fillAdult();
    fireEvent.change(screen.getByLabelText("Doğum tarihiniz"), { target: { value: "2016-01-01" } });
    expect(screen.getByLabelText("Veli e-posta adresi")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Kayıt ol" }));
    expect(registerMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Veli e-posta adresi"), { target: { value: "veli@ornek.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Kayıt ol" }));
    await waitFor(() => expect(registerMock).toHaveBeenCalled());
    expect(registerMock.mock.calls[0][0].data.guardianEmail).toBe("veli@ornek.com");
  });

  it("429'da genel mesaj yerine bekleme uyarısı gösterir", async () => {
    registerMock.mockRejectedValue(Object.assign(new Error("rate limit exceeded"), { status: 429 }));
    renderWithProviders(<RegisterForm />);
    fillAdult();
    fireEvent.click(screen.getByRole("button", { name: "Kayıt ol" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Çok fazla deneme"));
    expect(screen.queryByText(REGISTER_NEUTRAL_MESSAGE)).not.toBeInTheDocument();
  });
});

describe("VerifyEmailForm", () => {
  afterEach(() => verifyMock.mockReset());

  it("parolayı token ile gönderir ve kullanıcı adını gösterir", async () => {
    verifyMock.mockResolvedValue({ data: { userId: "u1", username: "ilc100042" } });
    renderWithProviders(<VerifyEmailForm token="tok-1" />);
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "gizli123" } });
    fireEvent.change(screen.getByLabelText("Parola (tekrar)"), { target: { value: "gizli123" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydı tamamla" }));
    expect(await screen.findByText("ilc100042")).toBeInTheDocument();
    expect(verifyMock).toHaveBeenCalledWith({ token: "tok-1", data: { password: "gizli123" } });
  });

  it("uyuşmayan parolada istek göndermez", () => {
    renderWithProviders(<VerifyEmailForm token="tok-1" />);
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "gizli123" } });
    fireEvent.change(screen.getByLabelText("Parola (tekrar)"), { target: { value: "baska456" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydı tamamla" }));
    expect(verifyMock).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("aynı değil");
  });

  it("geçersiz bağlantıda yeniden kayıt bağlantısı sunar", async () => {
    verifyMock.mockRejectedValue(Object.assign(new Error("Geçersiz veya süresi dolmuş doğrulama bağlantısı"), { status: 400 }));
    renderWithProviders(<VerifyEmailForm token="eski" />);
    fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "gizli123" } });
    fireEvent.change(screen.getByLabelText("Parola (tekrar)"), { target: { value: "gizli123" } });
    fireEvent.click(screen.getByRole("button", { name: "Kaydı tamamla" }));
    expect(await screen.findByRole("link", { name: "Kaydı yeniden başlat" })).toHaveAttribute("href", "/register");
  });
});

describe("GuardianConsentView", () => {
  afterEach(() => consentMock.mockReset());

  it("sayfa açılınca onay göndermez; düğmeyle gönderir", async () => {
    consentMock.mockResolvedValue({ data: { message: "Onaylandı" } });
    renderWithProviders(<GuardianConsentView token="c-1" />);
    expect(consentMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Onaylıyorum" }));
    expect(await screen.findByText("Onayınız alındı")).toBeInTheDocument();
    expect(consentMock).toHaveBeenCalledWith({ token: "c-1" });
  });

  it("geçersiz bağlantıda hata gösterir", async () => {
    consentMock.mockRejectedValue(Object.assign(new Error("x"), { status: 400 }));
    renderWithProviders(<GuardianConsentView token="c-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Onaylıyorum" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("geçersiz ya da süresi dolmuş"));
  });
});
