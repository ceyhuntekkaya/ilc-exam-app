import { renderWithProviders, screen } from "@/src/test/renderWithProviders";
import { afterEach, describe, expect, it, vi } from "vitest";

const useCandidatesMock = vi.fn();
const useResultMock = vi.fn();

vi.mock("@/src/api/generated/company-distributions/company-distributions", () => ({
  useCandidates: () => useCandidatesMock(),
  useResult: (...args: unknown[]) => useResultMock(...args),
}));
vi.mock("@/src/features/results/ResultsSection", () => ({ ResultPaper: () => <div>Sonuç kâğıdı</div> }));

const { CandidateResultSection } = await import("./CandidateResultSection");

const ok = (data: unknown) => ({ data: { data }, isLoading: false, isError: false, isSuccess: true, error: null, refetch: vi.fn() });

describe("CandidateResultSection", () => {
  afterEach(() => {
    useCandidatesMock.mockReset();
    useResultMock.mockReset();
  });

  it("denemesi olmayan adayda sonuç çağrısını kapatır ve 'Aday henüz sınava başlamadı' gösterir", () => {
    useCandidatesMock.mockReturnValue(ok([{ ilcIdentityId: "i1", status: "ALLOCATED" }]));
    useResultMock.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn() });

    renderWithProviders(<CandidateResultSection companyId="c" distributionId="d" candidateId="i1" />);

    expect(screen.getByText("Aday henüz sınava başlamadı")).toBeInTheDocument();
    expect(useResultMock).toHaveBeenCalledWith("d", "i1", { query: { enabled: false } });
  });

  it("denemesi olan adayın sonucunu applicationId olmadan çağırır", () => {
    useCandidatesMock.mockReturnValue(ok([{ ilcIdentityId: "i1", status: "STARTED", latestApplicationId: "a1" }]));
    useResultMock.mockReturnValue(ok({ applicationId: "a1", answers: [] }));

    renderWithProviders(<CandidateResultSection companyId="c" distributionId="d" candidateId="i1" />);

    expect(screen.getByText("Sonuç kâğıdı")).toBeInTheDocument();
    expect(useResultMock).toHaveBeenCalledWith("d", "i1", { query: { enabled: true } });
  });

  it("backend 'başlamadı' hatası da aynı boş durumu gösterir", () => {
    useCandidatesMock.mockReturnValue({ ...ok([]), isSuccess: true });
    useResultMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Aday bu dağıtımda henüz sınava başlamadı: i1"),
      refetch: vi.fn(),
    });

    renderWithProviders(<CandidateResultSection companyId="c" distributionId="d" candidateId="i1" />);

    expect(screen.getByText("Aday henüz sınava başlamadı")).toBeInTheDocument();
  });
});
