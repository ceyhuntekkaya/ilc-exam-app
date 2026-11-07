import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import type { ReportModel } from "@/src/api/generated/models";

const useInstitutionReportMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useInstitutionReport: () => useInstitutionReportMock(),
}));

const { InstitutionLevelReport } = await import("./InstitutionLevelReport");

const REPORTS: ReportModel[] = [
  { applicationResultId: "1", cefrLevel: "A2", assuranceLevel: "EQUATED", integrityLevel: "x" },
  { applicationResultId: "2", cefrLevel: "A2", assuranceLevel: "UNVERIFIED", integrityLevel: "x" },
  { applicationResultId: "3", cefrLevel: "B1", assuranceLevel: "EQUATED", integrityLevel: "x" },
];

describe("InstitutionLevelReport", () => {
  it("kohort dağılımını doğru sayar", () => {
    useInstitutionReportMock.mockReturnValue({ isLoading: false, isError: false, data: { data: REPORTS } });

    renderWithProviders(<InstitutionLevelReport companyId="c-1" />);

    expect(screen.getByText("A2: 2 (%67)")).toBeInTheDocument();
    expect(screen.getByText("B1: 1 (%33)")).toBeInTheDocument();
  });
});
