import { fireEvent, renderWithProviders, screen, waitFor } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const historyState = vi.fn();
const certState = vi.fn();
const downloadMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({ useMyHistory: () => historyState() }));
vi.mock("@/src/api/generated/candidate-portal-controller/candidate-portal-controller", () => ({ useMyCertificate: () => certState() }));
vi.mock("@/src/features/reports/downloadLevelReport", () => ({ downloadMyLevelReport: (...a: unknown[]) => downloadMock(...a) }));

const { LevelReportDownloadSection } = await import("./LevelReportDownloadSection");

const history = (items: unknown[]) => ({ isLoading: false, isError: false, data: { data: items } });
const cert = (data: unknown) => ({ isLoading: false, isError: false, isFetching: false, data: { data }, refetch: vi.fn() });

afterEach(() => {
  vi.clearAllMocks();
  historyState.mockReset();
  certState.mockReset();
});

describe("LevelReportDownloadSection", () => {
  it("sonuç yayınlanmadıysa hiçbir şey göstermez", () => {
    historyState.mockReturnValue(history([]));
    certState.mockReturnValue(cert({ levelReportReady: false }));
    const { container } = renderWithProviders(<LevelReportDownloadSection applicationId="app-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hazır değilken 'hazırlanıyor' ve 'Yeniden sorgula' gösterir; indirme düğmesi yoktur", () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    const state = cert({ levelReportReady: false });
    certState.mockReturnValue(state);
    renderWithProviders(<LevelReportDownloadSection applicationId="app-1" />);
    expect(screen.getByRole("status")).toHaveTextContent("hazırlanıyor");
    expect(screen.queryByRole("button", { name: "Seviye raporunu indir" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yeniden sorgula" }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it("hazırken indirir (sunucu yoluyla) ve doğrulama bağlantısını sunar", async () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certState.mockReturnValue(
      cert({ levelReportReady: true, levelReportUrl: "/report/me/results/ar-1/level-report", levelReportVerificationUrl: "https://app.example/verify/ABC" }),
    );
    downloadMock.mockResolvedValue(undefined);
    renderWithProviders(<LevelReportDownloadSection applicationId="app-1" />);
    fireEvent.click(screen.getByRole("button", { name: "Seviye raporunu indir" }));
    await waitFor(() => expect(downloadMock).toHaveBeenCalledWith("ar-1", "/report/me/results/ar-1/level-report"));
    expect(screen.getByRole("link", { name: "https://app.example/verify/ABC" })).toHaveAttribute("href", "https://app.example/verify/ABC");
    expect(screen.getByText(/bir sertifika değildir/)).toBeInTheDocument();
  });

  it("alan yoksa (bilinmiyor) kart gösterilmez", () => {
    historyState.mockReturnValue(history([{ applicationId: "app-1", applicationResultId: "ar-1" }]));
    certState.mockReturnValue(cert({ available: false }));
    const { container } = renderWithProviders(<LevelReportDownloadSection applicationId="app-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
