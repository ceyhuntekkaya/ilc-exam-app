import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const historyState = vi.fn();
const certificateState = vi.fn();
const reviewMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({ useMyHistory: () => historyState() }));
vi.mock("@/src/api/generated/candidate-portal-controller/candidate-portal-controller", () => ({
  useMyCertificate: () => certificateState(),
  useOpenReviewRequest: () => ({ mutateAsync: reviewMock, isPending: false }),
}));

const { CandidateCertificateSection } = await import("./CandidateCertificateSection");

const history = (items: unknown[]) => ({ isLoading: false, isError: false, data: { data: items } });
const cert = (data: unknown) => ({ isLoading: false, isError: false, data: { data }, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  historyState.mockReset();
  certificateState.mockReset();
});

describe("CandidateCertificateSection", () => {
  it("sonuç henüz yayınlanmadıysa (geçmişte yok) hiçbir şey göstermez", () => {
    historyState.mockReturnValue(history([]));
    certificateState.mockReturnValue(cert({ available: false }));
    const { container } = renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("kapı kapalıyken 'Sertifika henüz verilmiyor' boş durumu gösterir; hata ekranı değil", () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certificateState.mockReturnValue(cert({ available: false, message: "Bu sonuç için sertifika yok, seviye raporu kullanılabilir", levelReportUrl: "/report/me/results/ar-1/pdf" }));
    renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    expect(screen.getByText("Sertifika henüz verilmiyor")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("düzenlenmiş sertifikada kod, geçerlilik ve doğrulama bağlantısı görünür", () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certificateState.mockReturnValue(cert({ available: true, certificateCode: "ILC-XYZ-1", issuedAt: "2026-10-01T00:00:00Z", validUntil: "2099-10-01T00:00:00Z", verificationUrl: "https://app.example/verify/ILC-XYZ-1" }));
    renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    expect(screen.getByText("ILC-XYZ-1")).toBeInTheDocument();
    expect(screen.getByText("Geçerli")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Doğrulama sayfasını aç" })).toHaveAttribute("href", "/verify/ILC-XYZ-1");
    expect(screen.queryByText("Sertifika henüz verilmiyor")).not.toBeInTheDocument();
  });

  it("sertifika ucu hata verirse bölümde yeniden dene sunulur (sayfa çökmez)", () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certificateState.mockReturnValue({ isLoading: false, isError: true, error: Object.assign(new Error("x"), { status: 500 }), refetch: vi.fn() });
    renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    expect(screen.getByText("Sertifika bilgisi alınamadı")).toBeInTheDocument();
  });

  it("inceleme talebi: boş gerekçe gönderilmez; gerekçeyle gönderilince onay görünür", async () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certificateState.mockReturnValue(cert({ available: false }));
    reviewMock.mockResolvedValue({ data: { reviewRequestId: "rr-1", requestedAt: "2026-11-09T10:00:00Z" } });
    renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    fireEvent.click(screen.getByRole("button", { name: "İnceleme talep et" }));
    fireEvent.click(screen.getByRole("button", { name: "Talebi gönder" }));
    expect(reviewMock).not.toHaveBeenCalled();
    expect(screen.getByText(/gerekçesini yazın/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Gerekçeniz"), { target: { value: "Yazma puanım hatalı" } });
    fireEvent.click(screen.getByRole("button", { name: "Talebi gönder" }));
    await waitFor(() => expect(reviewMock).toHaveBeenCalledWith({ applicationResultId: "ar-1", data: { reason: "Yazma puanım hatalı" } }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("İnceleme talebiniz alındı"));
  });

  it("inceleme talebi 409 (itiraz süresi doldu) sunucu mesajıyla gösterilir", async () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certificateState.mockReturnValue(cert({ available: false }));
    reviewMock.mockRejectedValue(Object.assign(new Error("İtiraz süresi doldu: 2026-12-01T00:00:00Z"), { status: 409 }));
    renderWithProviders(<CandidateCertificateSection applicationId="app-1" />);
    fireEvent.click(screen.getByRole("button", { name: "İnceleme talep et" }));
    fireEvent.change(screen.getByLabelText("Gerekçeniz"), { target: { value: "Gerekçe" } });
    fireEvent.click(screen.getByRole("button", { name: "Talebi gönder" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("İtiraz süresi doldu"));
  });
});
