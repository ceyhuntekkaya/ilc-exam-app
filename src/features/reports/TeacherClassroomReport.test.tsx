import { fireEvent, renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import type { ReportModel } from "@/src/api/generated/models";

const useTeacherReportMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useTeacherReport: (companyId: string, orgUnitId: string, options: unknown) => useTeacherReportMock(companyId, orgUnitId, options),
}));

const { TeacherClassroomReport } = await import("./TeacherClassroomReport");

const REPORT: ReportModel = {
  applicationResultId: "ar-1",
  integrityLevel: "ILC_PROCTORED",
  assuranceLevel: "EQUATED",
  cefrLevel: "A2",
  outcomeBreakdown: [
    { outcomeId: "o1", name: "Listening for gist", percent: 40, itemCount: 3 },
    { outcomeId: "o2", name: "Vocabulary range", percent: 85, itemCount: 4 },
  ],
};

describe("TeacherClassroomReport", () => {
  it("birim kimliği girilip gönderilmeden sorgu ETKİN değildir, sonra kazanım kırılımını TOPLAMADAN gösterir", () => {
    useTeacherReportMock.mockReturnValue({ isLoading: false, isError: false, data: { data: [REPORT] } });

    renderWithProviders(<TeacherClassroomReport companyId="c-1" />);
    fireEvent.change(screen.getByPlaceholderText("UUID"), { target: { value: "unit-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Göster" }));

    expect(screen.getByText("Listening for gist")).toBeInTheDocument();
    expect(screen.getByText("%40")).toBeInTheDocument();
    expect(screen.getByText("%85")).toBeInTheDocument();
    expect(screen.queryByText(/toplam/i)).not.toBeInTheDocument();
  });
});
