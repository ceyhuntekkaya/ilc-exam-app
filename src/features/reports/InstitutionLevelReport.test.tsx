import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import type { ReportModel } from "@/src/api/generated/models";
import { byMonth, byUnit, summarize } from "./institutionReportModel";

const useInstitutionReportMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useInstitutionReport: () => useInstitutionReportMock(),
}));
vi.mock("@/src/api/generated/org-units/org-units", () => ({
  useList20: () => ({ data: { data: { items: [{ id: "u1", name: "9-A Sınıfı" }] } } }),
}));

const { InstitutionLevelReport } = await import("./InstitutionLevelReport");

const REPORTS: ReportModel[] = [
  { applicationResultId: "1", cefrLevel: "A2", assuranceLevel: "EQUATED", integrityLevel: "ILC_PROCTORED", passed: true, totalScore: 80, maxScore: 100, publishedAt: "2026-03-05T10:00:00Z", membership: { orgUnitId: "u1" } },
  { applicationResultId: "2", cefrLevel: "A2", assuranceLevel: "UNVERIFIED", integrityLevel: "UNPROCTORED", passed: false, totalScore: 40, maxScore: 100, publishedAt: "2026-03-20T10:00:00Z", membership: { orgUnitId: "u1" } },
  { applicationResultId: "3", cefrLevel: "B1", assuranceLevel: "EQUATED", integrityLevel: "ILC_PROCTORED", passed: true, totalScore: 90, maxScore: 100, publishedAt: "2026-04-02T10:00:00Z" },
];

describe("InstitutionLevelReport", () => {
  it("özet, birim ve etiketleri gösterir", () => {
    useInstitutionReportMock.mockReturnValue({ isLoading: false, isError: false, data: { data: REPORTS } });
    renderWithProviders(<InstitutionLevelReport companyId="c-1" />);

    expect(screen.getAllByText("2 (%67)").length).toBeGreaterThan(0); // A2 ve EQUATED/ILC
    expect(screen.getByText("9-A Sınıfı")).toBeInTheDocument();
    expect(screen.getByText("Birimsiz")).toBeInTheDocument();
    expect(screen.getByText("Doğrulanmamış")).toBeInTheDocument();
    expect(screen.getByText("Geçme oranı").nextElementSibling).toHaveTextContent("%67");
    expect(screen.getByText("2026-03")).toBeInTheDocument();
  });

  it("model: özet, birim ve ay hesapları", () => {
    expect(summarize(REPORTS)).toEqual({ total: 3, passRate: 67, avgPercent: 70 });
    const units = byUnit(REPORTS);
    expect(units[0]).toMatchObject({ unitId: "u1", count: 2, avgPercent: 60 });
    expect(byMonth(REPORTS).map((m) => m.period)).toEqual(["2026-03", "2026-04"]);
  });
});
