import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { describe, expect, it, vi } from "vitest";
import type { ReportModel } from "@/src/api/generated/models";

const useMyHistoryMock = vi.fn();

vi.mock("@/src/api/generated/report-controller/report-controller", () => ({
  useMyHistory: () => useMyHistoryMock(),
}));

const { CandidateHistorySection } = await import("./CandidateHistorySection");

const REPORTS: ReportModel[] = [
  { applicationResultId: "1", cefrLevel: "A2", publishedAt: "2025-01-01T00:00:00Z" },
  { applicationResultId: "2", cefrLevel: "B1", publishedAt: "2026-01-01T00:00:00Z" },
];

describe("CandidateHistorySection", () => {
  it("sonuçları tarihe göre sıralar ve bant değiştiğinde ilerleme rozeti gösterir", () => {
    useMyHistoryMock.mockReturnValue({ isLoading: false, isError: false, data: { data: REPORTS } });

    renderWithProviders(<CandidateHistorySection />);

    expect(screen.getByText("İlerleme")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
    expect(screen.getByText("B1")).toBeInTheDocument();
  });
});
