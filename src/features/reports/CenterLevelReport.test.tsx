import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";

const useCenterReportMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useCenterReport: () => useCenterReportMock(),
}));

const { CenterLevelReport } = await import("./CenterLevelReport");

describe("CenterLevelReport", () => {
  it("AI-insan uyumunu ve gözetimli payı gösterir", () => {
    useCenterReportMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: {
          aiHumanAgreement: [{ itemId: "item-1", agreementRate: 0.82, sampleSize: 30 }],
          oversightShare: { ilcProctored: 40, selfProctored: 60 },
        },
      },
    });

    renderWithProviders(<CenterLevelReport />);

    expect(screen.getByText("item-1")).toBeInTheDocument();
    expect(screen.getByText("%82")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });
});
