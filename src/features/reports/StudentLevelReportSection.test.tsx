import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import type { ReportModel } from "@/src/api/generated/models";

const useMyHistoryMock = vi.fn();
const useMyCanDoMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useMyHistory: () => useMyHistoryMock(),
  useMyCanDo: () => useMyCanDoMock(),
}));
vi.mock("@/src/features/results/downloadReportCardsPdf", () => ({
  downloadMyReportCardPdf: vi.fn(),
}));

const { StudentLevelReportSection } = await import("./StudentLevelReportSection");

const BASE_REPORT: ReportModel = {
  applicationResultId: "ar-1",
  applicationId: "app-1",
  integrityLevel: "ILC_PROCTORED",
  assuranceLevel: "UNVERIFIED",
  cefrLevel: "B1",
  skillBands: { READING: "B1" },
  outcomeBreakdown: [{ outcomeId: "o1", name: "Reading comprehension", percent: 72, itemCount: 5 }],
};

describe("StudentLevelReportSection", () => {
  it("onaylı set yoksa (pending) taslak metin basmaz, 'hazırlanıyor' gösterir", () => {
    useMyHistoryMock.mockReturnValue({ isLoading: false, isError: false, data: { data: [BASE_REPORT] } });
    useMyCanDoMock.mockReturnValue({ isLoading: false, data: { data: { statements: {}, pending: true } } });

    renderWithProviders(<StudentLevelReportSection applicationId="app-1" />);

    expect(screen.getByText("Hazırlanıyor.")).toBeInTheDocument();
  });

  it("onaylı set varsa can-do ifadelerini gösterir", () => {
    useMyHistoryMock.mockReturnValue({ isLoading: false, isError: false, data: { data: [BASE_REPORT] } });
    useMyCanDoMock.mockReturnValue({
      isLoading: false,
      data: { data: { statements: { READING: ["Can understand short texts."] }, pending: false } },
    });

    renderWithProviders(<StudentLevelReportSection applicationId="app-1" />);

    expect(screen.getByText("Can understand short texts.")).toBeInTheDocument();
    expect(screen.getByText("CEFR: B1")).toBeInTheDocument();
  });

  it("kazanım kırılımında toplam BASMAZ, yalnız yüzde ve madde sayısı gösterir", () => {
    useMyHistoryMock.mockReturnValue({ isLoading: false, isError: false, data: { data: [BASE_REPORT] } });
    useMyCanDoMock.mockReturnValue({ isLoading: false, data: { data: { statements: {}, pending: false } } });

    renderWithProviders(<StudentLevelReportSection applicationId="app-1" />);

    expect(screen.getByText("%72")).toBeInTheDocument();
    expect(screen.queryByText(/toplam/i)).not.toBeInTheDocument();
  });
});
